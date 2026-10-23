import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Testes de rejeições somente no Supabase local.");
const options = { auth: { persistSession: false, autoRefreshToken: false } },
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
test("catálogo, busca PostgreSQL e isolamento de favoritos/histórico", async (t) => {
  const users = [],
    clients = [];
  try {
    for (let i = 0; i < 2; i++) {
      const email = `rejection-${randomUUID()}@example.test`,
        password = `Senha-${randomUUID()}!`;
      const r = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(r.error, null);
      users.push(r.data.user.id);
      const client = createClient(url, key, options);
      assert.equal(
        (await client.auth.signInWithPassword({ email, password })).error,
        null,
      );
      clients.push(client);
    }
    const [alice, bob] = clients;
    const run = async (params) => {
      const r = await alice.rpc("search_rejections", params);
      assert.equal(r.error, null);
      return r.data;
    };
    const initial = await run({});
    const id = initial.items.find((r) => r.code === "694").id;
    await t.test(
      "catálogo real possui oito entradas com fontes oficiais e Oobj",
      async () => {
        assert.equal(initial.catalogSize, 8);
        assert.equal(initial.items.length, 8);
        const r = await alice
          .from("rejection_sources")
          .select("*")
          .eq("rejection_id", id);
        assert.equal(r.error, null);
        assert.ok(r.data.some((s) => s.is_official));
        assert.ok(r.data.some((s) => s.publisher === "Oobj"));
      },
    );
    await t.test("código, texto sem acentos, alias e aproximação", async () => {
      assert.equal((await run({ p_code: "694" })).items[0].code, "694");
      assert.ok(
        (await run({ p_query: "nao informado grupo" })).items.some(
          (r) => r.code === "694",
        ),
      );
      assert.ok(
        (await run({ p_query: "CFOP inexsitente" })).items.some(
          (r) => r.code === "770",
        ),
      );
      assert.ok(
        (
          await run({ p_query: "Total da NF-e difere do calculado" })
        ).items.some((r) => r.code === "610"),
      );
    });
    await t.test(
      "filtros de modelo, vazio, página e metacaracteres",
      async () => {
        assert.equal((await run({ p_code: "694", p_model: "65" })).total, 0);
        assert.equal((await run({ p_code: "9999" })).total, 0);
        assert.equal((await run({ p_page: 2 })).items.length, 0);
        assert.equal((await run({ p_page: 2 })).total, 8);
        assert.equal((await run({ p_query: "%_\\" })).total, 0);
        assert.ok((await alice.rpc("search_rejections", { p_page: 0 })).error);
      },
    );
    await t.test(
      "favoritos são idempotentes e isolados por usuário",
      async () => {
        for (let i = 0; i < 2; i++)
          assert.equal(
            (
              await alice
                .from("rejection_favorites")
                .upsert(
                  { user_id: users[0], rejection_id: id },
                  {
                    onConflict: "user_id,rejection_id",
                    ignoreDuplicates: true,
                  },
                )
            ).error,
            null,
          );
        assert.equal((await run({ p_favorites: true })).total, 1);
        assert.equal(
          (await bob.rpc("search_rejections", { p_favorites: true })).data
            .total,
          0,
        );
        assert.ok(
          (
            await bob
              .from("rejection_favorites")
              .insert({ user_id: users[0], rejection_id: id })
          ).error,
        );
      },
    );
    await t.test(
      "histórico privado gera atividade e pode ser limpo sem apagar favoritos",
      async () => {
        assert.equal(
          (
            await alice
              .from("search_history")
              .insert({
                user_id: users[0],
                query: "694",
                kind: "rejection",
                result_id: id,
              })
          ).error,
          null,
        );
        assert.equal(
          (
            await bob
              .from("search_history")
              .select("id")
              .eq("user_id", users[0])
          ).data.length,
          0,
        );
        assert.equal(
          (
            await alice
              .from("activity_events")
              .select("id")
              .eq("action", "rejection_searched")
          ).data.length,
          1,
        );
        assert.equal(
          (
            await alice
              .from("search_history")
              .delete()
              .eq("user_id", users[0])
              .eq("kind", "rejection")
          ).error,
          null,
        );
        assert.equal((await run({ p_favorites: true })).total, 1);
      },
    );
    await t.test("cliente não altera catálogo ou fontes globais", async () => {
      assert.ok(
        (
          await alice
            .from("rejection_catalog")
            .update({ title: "alteração indevida" })
            .eq("id", id)
        ).error,
      );
      assert.ok(
        (await alice.from("rejection_sources").delete().eq("rejection_id", id))
          .error,
      );
    });
    await t.test("anon e sessão revogada não pesquisam", async () => {
      const anon = createClient(url, key, options);
      assert.ok((await anon.rpc("search_rejections", {})).error);
      const session = await alice.auth.getSession();
      const stale = createClient(url, key, {
        ...options,
        global: {
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        },
      });
      await alice.auth.signOut();
      assert.ok((await stale.rpc("search_rejections", {})).error);
    });
  } finally {
    for (const id of users)
      assert.equal((await admin.auth.admin.deleteUser(id)).error, null);
  }
});
