import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Testes de validação exigem Supabase LOCAL.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
test("histórico real de validações: transação, isolamento e exclusão", async (t) => {
  const users = [],
    clients = [];
  try {
    for (let i = 0; i < 2; i++) {
      const email = `validator-${randomUUID()}@example.test`,
        password = `Senha-${randomUUID()}!`;
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(created.error, null);
      users.push(created.data.user.id);
      const c = createClient(
        url,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        options,
      );
      assert.equal(
        (await c.auth.signInWithPassword({ email, password })).error,
        null,
      );
      clients.push(c);
    }
    const [alice, bob] = clients,
      id = randomUUID(),
      path = `${users[0]}/validations/${id}.xml`;
    const schemas = await alice
      .from("schema_versions")
      .select("*")
      .eq("name", "nfe-010f")
      .single();
    assert.equal(schemas.error, null);
    const report = {
      filename: "sintetico.xml",
      sha256: "a".repeat(64),
      documentType: "NFe",
      layoutVersion: "4.00",
      accessKey: null,
      structure: "passed",
      xsd: "failed",
      rules: "not_verified",
      errors: 1,
      warnings: 0,
      checksRun: 2,
      notVerified: ["Assinatura"],
      schema: { id: "nfe-010f", bundleHash: schemas.data.sha256 },
      issues: [
        {
          severity: "error",
          level: "xsd",
          ruleId: "XSD",
          message: "Erro sintético de persistência",
          source: { url: schemas.data.source_url },
        },
      ],
    };
    await t.test(
      "salva relatório, issues e atividade atomicamente",
      async () => {
        const r = await alice.rpc("save_xml_validation", {
          p_id: id,
          p_report: report,
          p_path: path,
        });
        assert.equal(r.error, null);
        assert.equal(
          (
            await alice
              .from("validation_issues")
              .select("id")
              .eq("validation_id", id)
          ).data.length,
          1,
        );
        assert.equal(
          (
            await alice
              .from("activity_events")
              .select("id")
              .eq("action", "xml_validated")
          ).data.length,
          1,
        );
      },
    );
    await t.test(
      "outra conta não acessa relatório nem issues e não forja caminho alheio",
      async () => {
        assert.deepEqual(
          (await bob.from("xml_validations").select("*").eq("id", id)).data,
          [],
        );
        assert.deepEqual(
          (
            await bob
              .from("validation_issues")
              .select("*")
              .eq("validation_id", id)
          ).data,
          [],
        );
        assert.ok(
          (
            await bob.rpc("save_xml_validation", {
              p_id: randomUUID(),
              p_report: report,
              p_path: path,
            })
          ).error,
        );
      },
    );
    await t.test(
      "schema ausente ou issue inválida reverte a transação",
      async () => {
        for (const changed of [
          {
            ...report,
            schema: { id: "nao-existe", bundleHash: "0".repeat(64) },
          },
          {
            ...report,
            issues: [{ ...report.issues[0], severity: "invalida" }],
          },
        ]) {
          const failedId = randomUUID();
          assert.ok(
            (
              await alice.rpc("save_xml_validation", {
                p_id: failedId,
                p_report: changed,
                p_path: `${users[0]}/validations/${failedId}.xml`,
              })
            ).error,
          );
          assert.equal(
            (
              await alice
                .from("xml_validations")
                .select("id")
                .eq("id", failedId)
            ).data.length,
            0,
          );
        }
      },
    );
    await t.test("usuário não altera catálogo global de schemas", async () => {
      assert.ok(
        (
          await alice
            .from("schema_versions")
            .insert({
              name: "intruso",
              version: "1",
              document_type: "NFe",
              source_url: "https://example.test",
              sha256: "0".repeat(64),
            })
        ).error,
      );
    });
    await t.test(
      "excluir relatório remove issues; conta alheia não exclui",
      async () => {
        assert.equal(
          (await bob.from("xml_validations").delete().eq("id", id)).error,
          null,
        );
        assert.equal(
          (await alice.from("xml_validations").select("id").eq("id", id)).data
            .length,
          1,
        );
        assert.equal(
          (await alice.from("xml_validations").delete().eq("id", id)).error,
          null,
        );
        assert.deepEqual(
          (
            await alice
              .from("validation_issues")
              .select("id")
              .eq("validation_id", id)
          ).data,
          [],
        );
      },
    );
  } finally {
    for (const id of users)
      assert.equal((await admin.auth.admin.deleteUser(id)).error, null);
  }
});
