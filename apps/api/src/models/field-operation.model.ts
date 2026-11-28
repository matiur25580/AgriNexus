import mongoose, { Schema } from "mongoose";
const checklistSchema=new Schema({
 title:{type:String,required:true,trim:true,maxlength:180},
 required:{type:Boolean,default:true},
 completed:{type:Boolean,default:false},
 completedAt:{type:Date,default:null},
 completedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},
 note:{type:String,trim:true,maxlength:500,default:""}
},{_id:true});
const fieldOperationSchema=new Schema({
 organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
 taskCode:{type:String,required:true,trim:true,uppercase:true,maxlength:48},
 farmId:{type:Schema.Types.ObjectId,ref:"Farm",required:true,index:true},
 plotId:{type:Schema.Types.ObjectId,ref:"Plot",required:true,index:true},
 cropSeasonId:{type:Schema.Types.ObjectId,ref:"CropSeason",default:null,index:true},
 taskType:{type:String,enum:["irrigation","soil_sampling","crop_scouting","fertilization","weeding","harvest_preparation","equipment_check"],required:true},
 title:{type:String,required:true,trim:true,maxlength:180},
 description:{type:String,trim:true,maxlength:3000,default:""},
 priority:{type:String,enum:["low","normal","high","urgent"],default:"normal"},
 status:{type:String,enum:["planned","assigned","in_progress","blocked","completed","cancelled"],default:"planned",index:true},
 assignedTo:{type:Schema.Types.ObjectId,ref:"User",default:null,index:true},
 scheduledFor:{type:Date,required:true},
 dueAt:{type:Date,required:true},
 checklist:{type:[checklistSchema],default:[]},
 completionNote:{type:String,trim:true,maxlength:2000,default:""},
 createdBy:{type:Schema.Types.ObjectId,ref:"User",required:true},
 updatedBy:{type:Schema.Types.ObjectId,ref:"User",required:true},
 completedAt:{type:Date,default:null}
},{timestamps:true,versionKey:false});
fieldOperationSchema.index({organizationId:1,taskCode:1},{unique:true});
fieldOperationSchema.index({organizationId:1,farmId:1,plotId:1,status:1,scheduledFor:1});
fieldOperationSchema.index({organizationId:1,assignedTo:1,status:1,dueAt:1});

const fieldOperationEventSchema=new Schema({
 organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
 operationId:{type:Schema.Types.ObjectId,ref:"FieldOperation",required:true,index:true},
 actorId:{type:Schema.Types.ObjectId,ref:"User",required:true},
 action:{type:String,required:true,trim:true,maxlength:80},
 fromStatus:{type:String,default:null},
 toStatus:{type:String,default:null},
 metadata:{type:Schema.Types.Mixed,default:{}},
 occurredAt:{type:Date,default:Date.now,required:true}
},{timestamps:true});
fieldOperationEventSchema.index({organizationId:1,operationId:1,occurredAt:1});

const fieldObservationSchema=new Schema({
 organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
 farmId:{type:Schema.Types.ObjectId,ref:"Farm",required:true,index:true},
 plotId:{type:Schema.Types.ObjectId,ref:"Plot",required:true,index:true},
 cropSeasonId:{type:Schema.Types.ObjectId,ref:"CropSeason",default:null,index:true},
 observationType:{type:String,enum:["crop_health","soil_moisture","irrigation","weather","growth_stage","soil_sample"],required:true},
 observedAt:{type:Date,required:true,index:true},
 summary:{type:String,required:true,trim:true,minlength:3,maxlength:500},
 notes:{type:String,trim:true,maxlength:2000,default:""},
 measurementValue:{type:Number,min:0,max:100000000,default:null},
 measurementUnit:{type:String,trim:true,maxlength:40,default:""},
 latitude:{type:Number,min:-90,max:90,default:null},
 longitude:{type:Number,min:-180,max:180,default:null},
 recordedBy:{type:Schema.Types.ObjectId,ref:"User",required:true}
},{timestamps:true,versionKey:false});
fieldObservationSchema.index({organizationId:1,plotId:1,observedAt:-1});
fieldObservationSchema.index({organizationId:1,cropSeasonId:1,observedAt:-1});

export const FieldOperation:mongoose.Model<any>=mongoose.models.FieldOperation??mongoose.model("FieldOperation",fieldOperationSchema);
export const FieldOperationEvent:mongoose.Model<any>=mongoose.models.FieldOperationEvent??mongoose.model("FieldOperationEvent",fieldOperationEventSchema);
export const FieldObservation:mongoose.Model<any>=mongoose.models.FieldObservation??mongoose.model("FieldObservation",fieldObservationSchema);
