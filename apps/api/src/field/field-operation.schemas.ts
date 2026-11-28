import {z} from "zod";
const id=z.string().regex(/^[a-f\d]{24}$/i);
const date=z.coerce.date().transform((value)=>value.toISOString());
export const createFieldOperationSchema=z.object({
 farmId:id,plotId:id,cropSeasonId:id.optional(),
 taskType:z.enum(["irrigation","soil_sampling","crop_scouting","fertilization","weeding","harvest_preparation","equipment_check"]),
 title:z.string().trim().min(3).max(180),description:z.string().trim().max(3000).optional().default(""),
 priority:z.enum(["low","normal","high","urgent"]).default("normal"),
 assignedTo:id.optional(),scheduledFor:date,dueAt:date,
 checklist:z.array(z.object({title:z.string().trim().min(2).max(180),required:z.boolean().default(true)}).strict()).max(40).optional().default([])
}).strict().superRefine((v,ctx)=>{if(v.dueAt<v.scheduledFor)ctx.addIssue({code:"custom",path:["dueAt"],message:"Due date must be on or after scheduled date."});});
export const fieldOperationListSchema=z.object({
 farmId:id.optional(),plotId:id.optional(),cropSeasonId:id.optional(),
 status:z.enum(["planned","assigned","in_progress","blocked","completed","cancelled"]).optional(),
 assignedTo:id.optional(),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(25)
}).strict();
export const assignFieldOperationSchema=z.object({assignedTo:id}).strict();
export const transitionFieldOperationSchema=z.object({
 status:z.enum(["in_progress","blocked","completed","cancelled"]),note:z.string().trim().max(2000).optional().default("")
}).strict().superRefine((v,ctx)=>{if(v.status==="completed"&&v.note.length<5)ctx.addIssue({code:"custom",path:["note"],message:"A completion note is required."});});
export const checklistUpdateSchema=z.object({completed:z.boolean(),note:z.string().trim().max(500).optional().default("")}).strict();
export const createFieldObservationSchema=z.object({
 farmId:id,plotId:id,cropSeasonId:id.optional(),
 observationType:z.enum(["crop_health","soil_moisture","irrigation","weather","growth_stage","soil_sample"]),
 observedAt:date,summary:z.string().trim().min(3).max(500),notes:z.string().trim().max(2000).optional().default(""),
 measurementValue:z.number().min(0).max(100000000).optional(),measurementUnit:z.string().trim().max(40).optional().default(""),
 latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional()
}).strict().superRefine((v,ctx)=>{if((v.latitude===undefined)!==(v.longitude===undefined))ctx.addIssue({code:"custom",path:["latitude"],message:"Provide both coordinates or neither."});if(new Date(v.observedAt)>new Date())ctx.addIssue({code:"custom",path:["observedAt"],message:"Observation time cannot be in the future."});});
export const fieldObservationListSchema=z.object({
 farmId:id.optional(),plotId:id.optional(),cropSeasonId:id.optional(),
 observationType:z.enum(["crop_health","soil_moisture","irrigation","weather","growth_stage","soil_sample"]).optional(),
 from:date.optional(),to:date.optional(),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(25)
}).strict().superRefine((v,ctx)=>{if(v.from&&v.to&&v.to<v.from)ctx.addIssue({code:"custom",path:["to"],message:"End of observation range must not precede its start."});});
