"use client";
import { ResponseTask, type MechanicProps } from "./Gap";
/** Each authored source item is classified into one neutral bucket. */
export function Sort(props:MechanicProps){return <ResponseTask key={props.task.id} {...props}/>;}
