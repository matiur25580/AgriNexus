import {Router} from "express";
import {requireOrganization} from "../auth/auth.middleware.js";
import {requirePermission} from "../auth/permissions.js";
import {asyncRoute} from "../lib/async-route.js";
import {createFieldObservation,createFieldOperation,assignFieldOperation,getFieldOperation,listFieldOperationEvents,listFieldObservations,listFieldOperations,transitionFieldOperation,updateFieldChecklist} from "./field-operation.service.js";
import {assignFieldOperationSchema,checklistUpdateSchema,createFieldObservationSchema,createFieldOperationSchema,fieldObservationListSchema,fieldOperationListSchema,transitionFieldOperationSchema} from "./field-operation.schemas.js";

export const fieldOperationRouter=Router();
fieldOperationRouter.use(requireOrganization);
fieldOperationRouter.get("/operations",requirePermission("field:read"),asyncRoute(async(req,res)=>{
 const filters=fieldOperationListSchema.parse(req.query);
 const data=await listFieldOperations(req.organization!.id,filters);
 res.json({success:true,data:data.items,meta:data.pagination});
}));
fieldOperationRouter.post("/operations",requirePermission("field:write"),asyncRoute(async(req,res)=>{
 const input=createFieldOperationSchema.parse(req.body);
 const data=await createFieldOperation(req.organization!.id,req.auth!.userId,input);
 res.status(201).json({success:true,data});
}));
fieldOperationRouter.get("/operations/:operationId",requirePermission("field:read"),asyncRoute(async(req,res)=>{
 const data=await getFieldOperation(req.organization!.id,String(req.params.operationId??""));
 res.json({success:true,data});
}));
fieldOperationRouter.get("/operations/:operationId/events",requirePermission("field:read"),asyncRoute(async(req,res)=>{
 const data=await listFieldOperationEvents(req.organization!.id,String(req.params.operationId??""));
 res.json({success:true,data});
}));
fieldOperationRouter.patch("/operations/:operationId/assign",requirePermission("field:write"),asyncRoute(async(req,res)=>{
 const input=assignFieldOperationSchema.parse(req.body);
 const data=await assignFieldOperation(req.organization!.id,req.auth!.userId,String(req.params.operationId??""),input.assignedTo);
 res.json({success:true,data});
}));
fieldOperationRouter.patch("/operations/:operationId/status",requirePermission("field:write"),asyncRoute(async(req,res)=>{
 const input=transitionFieldOperationSchema.parse(req.body);
 const data=await transitionFieldOperation(req.organization!.id,req.auth!.userId,String(req.params.operationId??""),input.status,input.note);
 res.json({success:true,data});
}));
fieldOperationRouter.patch("/operations/:operationId/checklist/:itemId",requirePermission("field:write"),asyncRoute(async(req,res)=>{
 const input=checklistUpdateSchema.parse(req.body);
 const data=await updateFieldChecklist(req.organization!.id,req.auth!.userId,String(req.params.operationId??""),String(req.params.itemId??""),input.completed,input.note);
 res.json({success:true,data});
}));
fieldOperationRouter.get("/observations",requirePermission("field:read"),asyncRoute(async(req,res)=>{
 const filters=fieldObservationListSchema.parse(req.query);
 const data=await listFieldObservations(req.organization!.id,filters);
 res.json({success:true,data:data.items,meta:data.pagination});
}));
fieldOperationRouter.post("/observations",requirePermission("field:write"),asyncRoute(async(req,res)=>{
 const input=createFieldObservationSchema.parse(req.body);
 const data=await createFieldObservation(req.organization!.id,req.auth!.userId,input);
 res.status(201).json({success:true,data});
}));
