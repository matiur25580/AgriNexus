import {randomBytes} from "node:crypto";
import {Types} from "mongoose";
import {Membership} from "../models/membership.model.js";
import {Farm} from "../models/farm.model.js";
import {Plot} from "../models/plot.model.js";
import {CropSeason} from "../models/crop-season.model.js";
import {FieldOperation,FieldOperationEvent,FieldObservation} from "../models/field-operation.model.js";
import {HttpError} from "../lib/http-error.js";
import {canTransitionFieldOperation,hasRequiredChecklistComplete,isValidFieldWindow} from "./field-operation.rules.js";

const validId=(value:string)=>Types.ObjectId.isValid(value);
const taskCode=()=>"FLD-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+randomBytes(3).toString("hex").toUpperCase();
async function event(org:string,operationId:string,actor:string,action:string,fromStatus:string|null,toStatus:string|null,metadata:Record<string,unknown>={}){
 await FieldOperationEvent.create({organizationId:org,operationId,actorId:actor,action,fromStatus,toStatus,metadata});
}

export async function createFieldOperation(org:string,actor:string,input:{
 farmId:string;plotId:string;cropSeasonId?:string | undefined;taskType:string;title:string;description?:string;priority:string;
 assignedTo?:string | undefined;scheduledFor:string;dueAt:string;checklist?:Array<{title:string;required:boolean}>
}){
 if(!validId(input.farmId)||!validId(input.plotId)||(input.cropSeasonId&&!validId(input.cropSeasonId))||(input.assignedTo&&!validId(input.assignedTo)))throw new HttpError(400,"INVALID_FIELD_REFERENCE","A farm, plot, crop season or assignee identifier is invalid.");
 if(!isValidFieldWindow(input.scheduledFor,input.dueAt))throw new HttpError(400,"INVALID_FIELD_WINDOW","The due date must be on or after the scheduled date.");
 const farm=await Farm.findOne({_id:input.farmId,organizationId:org,status:"active"}).select("_id").lean().exec();
 if(!farm)throw new HttpError(404,"FARM_NOT_FOUND","An active farm in this organization was not found.");
 const plot=await Plot.findOne({_id:input.plotId,farmId:input.farmId,organizationId:org,status:"active"}).select("_id").lean().exec();
 if(!plot)throw new HttpError(404,"PLOT_NOT_FOUND","An active plot in the selected farm and organization was not found.");
 if(input.cropSeasonId){
  const season=await CropSeason.findOne({_id:input.cropSeasonId,farmId:input.farmId,plotId:input.plotId,organizationId:org,status:{$in:["planned","active"]}}).select("_id").lean().exec();
  if(!season)throw new HttpError(400,"CROP_SEASON_INVALID","The crop season must belong to this farm and plot and be planned or active.");
 }
 if(input.assignedTo){
  const member=await Membership.findOne({userId:input.assignedTo,organizationId:org,status:"active",role:{$in:["owner","admin","manager","field_agent"]}}).select("_id").lean().exec();
  if(!member)throw new HttpError(400,"FIELD_ASSIGNEE_INVALID","The assignee must be an active manager or field agent in this organization.");
 }
 const row=await FieldOperation.create({
  ...input,organizationId:org,taskCode:taskCode(),scheduledFor:new Date(input.scheduledFor),dueAt:new Date(input.dueAt),
  status:input.assignedTo?"assigned":"planned",createdBy:actor,updatedBy:actor
 });
 await event(org,String(row._id),actor,"field_operation_created",null,row.status,{taskCode:row.taskCode,farmId:input.farmId,plotId:input.plotId});
 return FieldOperation.findOne({_id:row._id,organizationId:org}).populate("farmId","name code").populate("plotId","name code").populate("cropSeasonId","seasonName cropName").populate("assignedTo","firstName lastName email").lean().exec();
}

export async function listFieldOperations(org:string,filters:{farmId?:string | undefined;plotId?:string | undefined;cropSeasonId?:string | undefined;status?:string | undefined;assignedTo?:string | undefined;page:number;limit:number}){
 const query:Record<string,unknown>={organizationId:org};
 for(const key of ["farmId","plotId","cropSeasonId","status","assignedTo"] as const)if(filters[key])query[key]=filters[key];
 const [items,total]=await Promise.all([
  FieldOperation.find(query).populate("farmId","name code").populate("plotId","name code").populate("cropSeasonId","seasonName cropName").populate("assignedTo","firstName lastName email").sort({scheduledFor:1,_id:1}).skip((filters.page-1)*filters.limit).limit(filters.limit).lean().exec(),
  FieldOperation.countDocuments(query).exec()
 ]);
 return {items,pagination:{page:filters.page,limit:filters.limit,total,pages:Math.ceil(total/filters.limit)}};
}

export async function assignFieldOperation(org:string,actor:string,id:string,assignedTo:string){
 if(!validId(id)||!validId(assignedTo))throw new HttpError(400,"INVALID_ASSIGNMENT","Valid task and assignee identifiers are required.");
 const member=await Membership.findOne({userId:assignedTo,organizationId:org,status:"active",role:{$in:["owner","admin","manager","field_agent"]}}).select("_id").lean().exec();
 if(!member)throw new HttpError(400,"FIELD_ASSIGNEE_INVALID","The assignee must be an active manager or field agent in this organization.");
 const row=await FieldOperation.findOne({_id:id,organizationId:org,status:{$in:["planned","assigned"]}}).exec();
 if(!row)throw new HttpError(404,"FIELD_OPERATION_NOT_ASSIGNABLE","A planned or assigned field task was not found.");
 const previous=row.status;row.assignedTo=new Types.ObjectId(assignedTo);row.status="assigned";row.updatedBy=new Types.ObjectId(actor);await row.save();
 await event(org,id,actor,"field_operation_assigned",previous,"assigned",{assignedTo});
 return FieldOperation.findOne({_id:id,organizationId:org}).populate("assignedTo","firstName lastName email").lean().exec();
}

export async function transitionFieldOperation(org:string,actor:string,id:string,toStatus:"in_progress"|"blocked"|"completed"|"cancelled",note:string){
 if(!validId(id))throw new HttpError(400,"INVALID_FIELD_OPERATION_ID","A valid task identifier is required.");
 const row=await FieldOperation.findOne({_id:id,organizationId:org}).exec();
 if(!row)throw new HttpError(404,"FIELD_OPERATION_NOT_FOUND","The field task was not found.");
 const previous=row.status;
 if(!canTransitionFieldOperation(previous,toStatus))throw new HttpError(409,"INVALID_FIELD_OPERATION_TRANSITION",`A task cannot move from ${previous} to ${toStatus}.`);
 if(toStatus==="in_progress"&&!row.assignedTo)throw new HttpError(409,"FIELD_ASSIGNEE_REQUIRED","Assign a field agent before starting work.");
 if(toStatus==="completed"){
  if(!hasRequiredChecklistComplete(row.checklist))throw new HttpError(409,"FIELD_CHECKLIST_INCOMPLETE","Complete all required checklist items before closing the task.");
  if(note.trim().length<5)throw new HttpError(400,"COMPLETION_NOTE_REQUIRED","A completion note of at least five characters is required.");
  row.completionNote=note;row.completedAt=new Date();
 }
 row.status=toStatus;row.updatedBy=new Types.ObjectId(actor);await row.save();
 await event(org,id,actor,"field_operation_status_changed",previous,toStatus,{note});
 return FieldOperation.findOne({_id:id,organizationId:org}).populate("assignedTo","firstName lastName email").lean().exec();
}

export async function updateFieldChecklist(org:string,actor:string,id:string,itemId:string,completed:boolean,note:string){
 if(!validId(id)||!validId(itemId))throw new HttpError(400,"INVALID_CHECKLIST_REFERENCE","Valid task and checklist identifiers are required.");
 const row=await FieldOperation.findOne({_id:id,organizationId:org,status:"in_progress"}).exec();
 if(!row)throw new HttpError(409,"FIELD_CHECKLIST_LOCKED","Checklist items can only be updated while a task is in progress.");
 const item=row.checklist.id(itemId);
 if(!item)throw new HttpError(404,"FIELD_CHECKLIST_ITEM_NOT_FOUND","The checklist item was not found.");
 item.completed=completed;item.completedAt=completed?new Date():null;item.completedBy=completed?new Types.ObjectId(actor):null;item.note=note;
 row.updatedBy=new Types.ObjectId(actor);await row.save();
 await event(org,id,actor,"field_checklist_item_updated",row.status,row.status,{itemId,completed,note});
 return FieldOperation.findOne({_id:id,organizationId:org}).lean().exec();
}

export async function createFieldObservation(org:string,actor:string,input:{
 farmId:string;plotId:string;cropSeasonId?:string | undefined;observationType:string;observedAt:string;summary:string;notes?:string;
 measurementValue?:number | undefined;measurementUnit?:string | undefined;latitude?:number | undefined;longitude?:number | undefined
}){
 if(!validId(input.farmId)||!validId(input.plotId)||(input.cropSeasonId&&!validId(input.cropSeasonId)))throw new HttpError(400,"INVALID_OBSERVATION_REFERENCE","A farm, plot or crop season identifier is invalid.");
 if((input.latitude===undefined)!==(input.longitude===undefined))throw new HttpError(400,"INCOMPLETE_COORDINATES","Provide both latitude and longitude, or neither.");
 if(new Date(input.observedAt)>new Date())throw new HttpError(400,"FUTURE_OBSERVATION","Observation time cannot be in the future.");
 const [farm,plot]=await Promise.all([
  Farm.findOne({_id:input.farmId,organizationId:org,status:"active"}).select("_id").lean().exec(),
  Plot.findOne({_id:input.plotId,farmId:input.farmId,organizationId:org,status:"active"}).select("_id").lean().exec()
 ]);
 if(!farm||!plot)throw new HttpError(404,"PLOT_NOT_FOUND","An active plot in the selected farm and organization was not found.");
 if(input.cropSeasonId){
  const season=await CropSeason.findOne({_id:input.cropSeasonId,farmId:input.farmId,plotId:input.plotId,organizationId:org}).select("_id").lean().exec();
  if(!season)throw new HttpError(400,"CROP_SEASON_INVALID","The crop season must belong to the selected farm and plot.");
 }
 return FieldObservation.create({...input,organizationId:org,observedAt:new Date(input.observedAt),recordedBy:actor});
}

export async function listFieldObservations(org:string,filters:{farmId?:string | undefined;plotId?:string | undefined;cropSeasonId?:string | undefined;observationType?:string | undefined;from?:string | undefined;to?:string | undefined;page:number;limit:number}){
 const query:Record<string,unknown>={organizationId:org};
 for(const key of ["farmId","plotId","cropSeasonId","observationType"] as const)if(filters[key])query[key]=filters[key];
 if(filters.from||filters.to)query.observedAt={...(filters.from?{$gte:new Date(filters.from)}:{}),...(filters.to?{$lte:new Date(filters.to)}:{})};
 const [items,total]=await Promise.all([
  FieldObservation.find(query).populate("farmId","name code").populate("plotId","name code").populate("cropSeasonId","seasonName cropName").populate("recordedBy","firstName lastName email").sort({observedAt:-1,_id:1}).skip((filters.page-1)*filters.limit).limit(filters.limit).lean().exec(),
  FieldObservation.countDocuments(query).exec()
 ]);
 return {items,pagination:{page:filters.page,limit:filters.limit,total,pages:Math.ceil(total/filters.limit)}};
}

export async function getFieldOperation(org:string,id:string){
 if(!validId(id))throw new HttpError(400,"INVALID_FIELD_OPERATION_ID","A valid task identifier is required.");
 const row=await FieldOperation.findOne({_id:id,organizationId:org}).populate("farmId","name code").populate("plotId","name code").populate("cropSeasonId","seasonName cropName").populate("assignedTo","firstName lastName email").lean().exec();
 if(!row)throw new HttpError(404,"FIELD_OPERATION_NOT_FOUND","The field task was not found.");
 return row;
}
export async function listFieldOperationEvents(org:string,id:string){
 if(!validId(id))throw new HttpError(400,"INVALID_FIELD_OPERATION_ID","A valid task identifier is required.");
 const exists=await FieldOperation.exists({_id:id,organizationId:org});
 if(!exists)throw new HttpError(404,"FIELD_OPERATION_NOT_FOUND","The field task was not found.");
 return FieldOperationEvent.find({organizationId:org,operationId:id}).populate("actorId","firstName lastName email").sort({occurredAt:1}).lean().exec();
}
