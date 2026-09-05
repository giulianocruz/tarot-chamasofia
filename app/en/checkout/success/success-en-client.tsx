"use client";
import { useEffect, useState } from "react";

export default function SuccessEnClient(){
  const [message,setMessage]=useState("Confirming your payment...");
  const [error,setError]=useState("");
  useEffect(()=>{
    const sessionId=new URLSearchParams(location.search).get("session_id")||"";
    if(!sessionId){setError("Checkout session not found.");return;}
    let cancelled=false; let attempts=0;
    const verify=async()=>{attempts+=1;try{
      const response=await fetch(`/api/international/verify?session_id=${encodeURIComponent(sessionId)}`,{cache:"no-store"});
      const data=await response.json(); if(!response.ok) throw new Error(data.error||"Unable to verify payment.");
      if(data.paid&&data.token){sessionStorage.removeItem("cs_intl_draft");setMessage("Payment confirmed. Opening your private reading...");setTimeout(()=>{location.href=`/en/reading/${data.token}`},700);return;}
      if(attempts<8&&!cancelled){setMessage("Payment received. Waiting for final confirmation...");setTimeout(verify,1800);return;}
      setError("We could not confirm the payment yet. You can safely refresh this page in a moment.");
    }catch(err){if(!cancelled)setError(err instanceof Error?err.message:"Unable to verify payment.");}};
    void verify(); return()=>{cancelled=true};
  },[]);
  return <main className="en-status-page"><div className="en-status-orb">✦</div><p className="en-kicker">CHAMA SOFIA</p><h1>{error?"Your payment is still being checked":message}</h1>{error&&<><p>{error}</p><button className="en-cta" onClick={()=>location.reload()}>CHECK AGAIN</button></>}</main>;
}
