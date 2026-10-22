"use client";
import { ResponseTask, type MechanicProps } from "./Gap";
/** Tiles can be placed by drag, pointer tap, or native keyboard buttons. */
export function Build(props:MechanicProps){return <ResponseTask key={props.task.id} {...props}/>;}
