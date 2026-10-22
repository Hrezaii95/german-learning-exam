"use client";
import type { GeneratedTask,GradeResult,TaskAnswer } from "../../../../packages/wortwerk/src/tasks.js";
import { Corners } from "./mechanics/Corners";
import { Sort } from "./mechanics/Sort";
import { Build } from "./mechanics/Build";
import { Order } from "./mechanics/Order";
import { Gap } from "./mechanics/Gap";
import { Listen } from "./mechanics/Listen";
export type TaskRendererProps={task:GeneratedTask;onAnswer:(answer:TaskAnswer)=>void;result?:GradeResult|null;disabled?:boolean};
export function TaskRenderer(props:TaskRendererProps){
 switch(props.task.mechanic){
  case "corners":return <Corners {...props}/>;
  case "sort":return <Sort {...props}/>;
  case "build":return <Build {...props}/>;
  case "order":return <Order {...props}/>;
  case "gap":return <Gap {...props}/>;
  case "listen":return <Listen {...props}/>;
  default:return <p role="alert">This interaction is unavailable in this version.</p>;
 }
}
