export const FIELD_OPERATION_TRANSITIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  planned: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["blocked", "completed", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  completed: [],
  cancelled: []
});
export function canTransitionFieldOperation(from:string,to:string):boolean {
  return (FIELD_OPERATION_TRANSITIONS[from]??[]).includes(to);
}
export function hasRequiredChecklistComplete(items:Array<{required:boolean;completed:boolean}>):boolean {
  return items.every(item=>!item.required||item.completed);
}
export function isValidFieldWindow(scheduledFor:Date|string,dueAt:Date|string):boolean {
  const start=new Date(scheduledFor).getTime(),end=new Date(dueAt).getTime();
  return Number.isFinite(start)&&Number.isFinite(end)&&end>=start;
}
