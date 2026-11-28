import {describe,expect,it} from "vitest";
import {canTransitionFieldOperation,hasRequiredChecklistComplete,isValidFieldWindow} from "./field-operation.rules.js";
describe("field operation lifecycle",()=>{
 it("allows only the declared transitions",()=>{
  expect(canTransitionFieldOperation("planned","assigned")).toBe(true);
  expect(canTransitionFieldOperation("in_progress","blocked")).toBe(true);
  expect(canTransitionFieldOperation("completed","in_progress")).toBe(false);
  expect(canTransitionFieldOperation("cancelled","completed")).toBe(false);
 });
 it("requires all mandatory checklist items before completion",()=>{
  expect(hasRequiredChecklistComplete([{required:true,completed:true},{required:false,completed:false}])).toBe(true);
  expect(hasRequiredChecklistComplete([{required:true,completed:false}])).toBe(false);
 });
 it("validates task scheduling windows",()=>{
  expect(isValidFieldWindow("2026-11-28T08:00:00Z","2026-11-28T12:00:00Z")).toBe(true);
  expect(isValidFieldWindow("2026-11-28T12:00:00Z","2026-11-28T08:00:00Z")).toBe(false);
 });
});
