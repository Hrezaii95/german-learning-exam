"use client";
import { ResponseTask, type MechanicProps } from "./Gap";
/** Sentence slots have identical appearance and no grammar-position hints. */
export function Order(props:MechanicProps){return <ResponseTask key={props.task.id} {...props}/>;}
