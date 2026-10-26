import { describe, it, expect } from 'vitest';
import { nicknameSchema, anonymousDeletionSchema } from '@/lib/auth/schemas';
describe('acesso por apelido',()=>{
 it('normaliza apelido sem aceitar propriedade de usuário ou papel',()=>expect(nicknameSchema.parse({nickname:'  Meu apelido  ',user_id:'outro',role:'admin'})).toEqual({nickname:'Meu apelido'}));
 it.each(['','ab','  ','x'.repeat(101)])('rejeita apelido inválido',nickname=>expect(nicknameSchema.safeParse({nickname}).success).toBe(false));
 it('exclusão anônima exige confirmação exata sem senha',()=>{
  expect(anonymousDeletionSchema.safeParse({confirmation:'EXCLUIR'}).success).toBe(true);
  expect(anonymousDeletionSchema.safeParse({confirmation:'excluir'}).success).toBe(false);
 });
});
