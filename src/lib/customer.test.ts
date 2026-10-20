import { describe, expect, it } from "vitest";
import {
  isValidCpf,
  isValidPhone,
  maskCpf,
  maskPhone,
  onlyDigits,
} from "@/lib/customer";

describe("customer helpers", () => {
  it("remove caracteres não numéricos", () => {
    expect(onlyDigits("(11) 98765-4321")).toBe("11987654321");
  });

  it("formata CPF e telefone", () => {
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
    expect(maskPhone("1132654321")).toBe("(11) 3265-4321");
  });

  it("valida CPF pelos dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("aceita telefones brasileiros com DDD", () => {
    expect(isValidPhone("(11) 98765-4321")).toBe(true);
    expect(isValidPhone("(11) 3265-4321")).toBe(true);
    expect(isValidPhone("98765-4321")).toBe(false);
  });
});
