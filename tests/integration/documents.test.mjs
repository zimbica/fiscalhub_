import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fixtureKey } from "../fixtures/fiscal-fixtures.ts";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Integração exige Supabase LOCAL.");
const options = { auth: { persistSession: false, autoRefreshToken: false } },
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const hash = (text) => createHash("sha256").update(text).digest("hex");
function document({
  number = 1,
  model = "55",
  env = "2",
  authorized = true,
  amount = "0.30",
  purpose = "1",
} = {}) {
  return {
    kind: "document",
    document: {
      access_key: fixtureKey(model, number),
      environment: env,
      model,
      layout_version: "4.00",
      number: String(number),
      series: "1",
      issued_at: "2026-10-20T10:00:00-03:00",
      authorized_at: authorized ? "2026-10-21T10:00:00-03:00" : null,
      operation_nature: "Fixture",
      purpose,
      emission_type: "1",
      operation_type: "1",
      issuer_tax_id: "12345678000195",
      recipient_tax_id: "11144477735",
      recipient_name: "Pessoa sintética",
      uf: "SP",
      issuer: { xNome: "Fixture" },
      recipient: {},
      total_value: amount,
      product_value: amount,
      discount_value: "0",
      freight_value: "0",
      tax_totals: { vICMS: "0.01", vIBS: "0.02", vCBS: "0.03" },
      other_totals: {},
      base_status: authorized ? "authorized" : "unconfirmed",
      evidence: [],
      content_hash: hash(`info-${number}-${model}-${env}-${amount}`),
      issues: [],
      data: {},
      items: [
        {
          item_number: 1,
          code: "P1",
          description: "Produto sintético",
          ncm: "19059090",
          cfop: "5102",
          tax_situation: "102",
          quantity: "1.1234567890",
          unit: "UN",
          unit_value: "0.1234567890",
          total_value: amount,
          discount_value: "0",
          taxes: {},
          data: {},
        },
      ],
      payments: [{ method: "01", value: amount, data: {} }],
    },
  };
}
function event({
  env = "2",
  accepted = true,
  code = "135",
  type = "110111",
  model = "55",
  number = 1,
} = {}) {
  return {
    kind: "event",
    event: {
      access_key: fixtureKey(model, number),
      environment: env,
      event_type: type,
      sequence: 1,
      occurred_at: "2026-10-20T11:00:00-03:00",
      registered_at: accepted ? "2026-10-20T11:01:00-03:00" : null,
      protocol: accepted ? "135261000000002" : null,
      status_code: code,
      accepted,
      evidence: { synthetic: true },
    },
  };
}
test("importação fiscal, evidências, relatórios e isolamento no banco real", async (t) => {
  const users = [],
    clients = [];
  let sequence = 0;
  try {
    for (const label of ["xml-a", "xml-b"]) {
      const email = `${label}-${randomUUID()}@example.test`,
        password = `Senha-${randomUUID()}!`;
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(created.error, null);
      users.push(created.data.user.id);
      const client = createClient(url, key, options);
      assert.equal(
        (await client.auth.signInWithPassword({ email, password })).error,
        null,
      );
      clients.push(client);
    }
    const [alice, bob] = clients;
    async function job(client = alice, owner = users[0]) {
      const r = await client
        .from("xml_imports")
        .insert({ user_id: owner, name: "Lote sintético" })
        .select()
        .single();
      assert.equal(r.error, null);
      return r.data.id;
    }
    async function save(
      jobId,
      payload,
      filename = `file-${sequence++}.xml`,
      client = alice,
    ) {
      const r = await client.rpc("save_import_file", {
        p_import_id: jobId,
        p_sha256: hash(JSON.stringify(payload)),
        p_filename: filename,
        p_payload: payload,
      });
      assert.equal(r.error, null);
      return r.data;
    }
    async function report(filters = {}, client = alice) {
      const r = await client.rpc("document_report", {
        p_filters: filters,
        p_page: 1,
      });
      assert.equal(r.error, null);
      return r.data;
    }
    const first = await job(),
      second = await job(),
      eventJob = await job();
    let docId;
    await t.test(
      "grava nota e filhos atomicamente, preservando decimais nos detalhes",
      async () => {
        const saved = await save(
          first,
          document({ authorized: false }),
          "nfe.xml",
        );
        docId = saved.documentId;
        assert.equal(saved.outcome, "imported");
        const detail = await alice.rpc("document_details", { p_id: docId });
        assert.equal(detail.error, null);
        assert.equal(detail.data.document.total_value, "0.30");
        assert.equal(detail.data.items[0].quantity, "1.1234567890");
        assert.equal(detail.data.document.status, "unconfirmed");
      },
    );
    await t.test(
      "reenvio idempotente e mesmo conteúdo com outro nome não duplicam nota",
      async () => {
        const repeated = await save(
          first,
          document({ authorized: false }),
          "nfe.xml",
        );
        assert.equal(repeated.replayed, true);
        assert.equal(
          (await save(first, document({ authorized: false }), "copia.xml"))
            .outcome,
          "duplicate",
        );
        assert.equal((await report()).total, 1);
        assert.equal(
          (await alice.from("import_files").select("*")).data.length,
          2,
        );
      },
    );
    await t.test(
      "protocolo posterior atualiza evidência sem duplicar itens",
      async () => {
        assert.equal(
          (await save(second, document(), "autorizada.xml")).outcome,
          "updated",
        );
        const result = await report();
        assert.equal(result.metrics.authorized, 1);
        assert.equal(result.metrics.items, 1);
      },
    );
    await t.test(
      "chave e ambiente iguais com conteúdo divergente geram conflito",
      async () => {
        assert.equal(
          (await save(second, document({ amount: "99.00" }))).outcome,
          "conflict",
        );
        assert.equal((await report()).metrics.total, "0.30");
      },
    );
    await t.test(
      "pedido/retorno não vinculado não cancela; retorno vinculado cancela",
      async () => {
        await save(eventJob, event({ accepted: false, code: "136" }));
        assert.equal((await report()).metrics.cancelled, 0);
        await save(eventJob, event());
        assert.equal((await report()).metrics.cancelled, 1);
      },
    );
    await t.test(
      "excluir evidência de cancelamento restaura situação restante",
      async () => {
        assert.equal(
          (await alice.from("import_files").delete().eq("import_id", eventJob))
            .error,
          null,
        );
        assert.equal((await report()).metrics.authorized, 1);
        assert.equal(
          (await alice.from("fiscal_events").select("*")).data.length,
          0,
        );
      },
    );
    await t.test(
      "excluir fonte de autorização retorna nota à situação não confirmada",
      async () => {
        assert.equal(
          (await alice.from("import_files").delete().eq("import_id", second))
            .error,
          null,
        );
        assert.equal((await report()).metrics.unconfirmed, 1);
        await save(second, document(), "autorizada-retomada.xml");
      },
    );
    await t.test(
      "ambientes e modelos são isolados; devolução não implica cancelamento",
      async () => {
        await save(second, document({ env: "1" }));
        await save(second, document({ model: "65", number: 2, purpose: "4" }));
        assert.equal((await report()).total, 3);
        assert.equal((await report()).metrics.cancelled, 0);
        await save(eventJob, event({ env: "1" }));
        assert.equal((await report({ environment: "1" })).metrics.cancelled, 1);
        assert.equal((await report({ environment: "2" })).metrics.cancelled, 0);
      },
    );
    await t.test(
      "evento anterior à nota é aplicado quando a nota chega",
      async () => {
        await save(eventJob, event({ number: 4 }));
        await save(second, document({ number: 4 }));
        assert.equal((await report({ number: "4" })).metrics.cancelled, 1);
      },
    );
    await t.test(
      "cancelamento por substituição aplica-se somente a NFC-e",
      async () => {
        await save(eventJob, event({ number: 2, model: "65", type: "110112" }));
        assert.equal((await report({ model: "65" })).metrics.cancelled, 1);
      },
    );
    await t.test(
      "todos os indicadores, gráficos e linhas obedecem aos filtros",
      async () => {
        const filters = {
          model: "65",
          environment: "2",
          cfop: "5102",
          ncm: "19059090",
          taxSituation: "102",
          payment: "01",
          product: "sintético",
          uf: "SP",
          min: "0.20",
          max: "0.40",
          purpose: "4",
        };
        const result = await report(filters);
        assert.equal(result.total, 1);
        assert.equal(result.rows.length, 1);
        assert.equal(result.metrics.total, "0.30");
        assert.equal(result.metrics.taxes, "0.06");
        assert.equal(result.charts.models.length, 1);
        assert.equal(result.charts.products.length, 1);
        assert.equal((await report({ ...filters, payment: "03" })).total, 0);
        assert.equal(
          (
            await report({
              number: "1",
              environment: "2",
              dateBasis: "issued",
              start: "2026-10-20",
              end: "2026-10-20",
            })
          ).total,
          1,
        );
        assert.equal(
          (
            await report({
              number: "1",
              environment: "2",
              dateBasis: "authorized",
              start: "2026-10-20",
              end: "2026-10-20",
            })
          ).total,
          0,
        );
      },
    );
    await t.test(
      "concorrência entre lotes mantém unicidade da nota",
      async () => {
        const jobs = [await job(), await job()];
        const results = await Promise.all(
          jobs.map((id) => save(id, document({ number: 7 }))),
        );
        assert.deepEqual(results.map((r) => r.outcome).sort(), [
          "duplicate",
          "imported",
        ]);
        assert.equal((await report({ number: "7" })).total, 1);
      },
    );
    await t.test(
      "RLS bloqueia lotes, recibos, relatórios e detalhes de outra conta",
      async () => {
        assert.equal((await report({}, bob)).total, 0);
        assert.equal(
          (await bob.rpc("document_details", { p_id: docId })).data,
          null,
        );
        assert.deepEqual((await bob.from("import_files").select("*")).data, []);
        assert.ok(
          (
            await bob.rpc("save_import_file", {
              p_import_id: first,
              p_sha256: hash("intruso"),
              p_filename: "intruso.xml",
              p_payload: document(),
            })
          ).error,
        );
        const bjob = await job(bob, users[1]);
        assert.equal(
          (await save(bjob, document(), "bob.xml", bob)).outcome,
          "imported",
        );
        assert.equal((await report({}, bob)).total, 1);
      },
    );
    await t.test(
      "falha em item reverte toda a nota; erro de XML pode ser registrado sem original",
      async () => {
        const malformed = document({ number: 9 });
        malformed.document.items[0].item_number = null;
        assert.ok(
          (
            await alice.rpc("save_import_file", {
              p_import_id: first,
              p_sha256: hash("bad"),
              p_filename: "bad.xml",
              p_payload: malformed,
            })
          ).error,
        );
        assert.equal((await report({ number: "9" })).total, 0);
        const invalid = await alice.rpc("save_import_file", {
          p_import_id: first,
          p_sha256: hash("invalid"),
          p_filename: "invalid.xml",
          p_payload: {},
          p_error: "XML malformado",
        });
        assert.equal(invalid.error, null);
        assert.equal(invalid.data.outcome, "invalid");
        assert.equal(invalid.data.path, null);
      },
    );
    await t.test(
      "exclusão de conta pelo Auth remove notas, eventos e recibos em cascata",
      async () => {
        for (const id of users) {
          assert.equal((await admin.auth.admin.deleteUser(id)).error, null);
          for (const table of [
            "fiscal_documents",
            "fiscal_events",
            "fiscal_items",
            "import_files",
            "xml_imports",
          ]) {
            const remaining = await admin
              .from(table)
              .select("id")
              .eq("user_id", id);
            assert.equal(remaining.error, null);
            assert.deepEqual(remaining.data, []);
          }
        }
        users.length = 0;
      },
    );
  } finally {
    for (const id of users)
      assert.equal((await admin.auth.admin.deleteUser(id)).error, null);
  }
});
