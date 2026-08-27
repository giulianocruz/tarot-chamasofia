import { ImageResponse } from 'next/og';
export const size={width:64,height:64};export const contentType='image/png';
export default function Icon(){return new ImageResponse(<div style={{width:'64px',height:'64px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',background:'linear-gradient(145deg,#4a142d,#16091f)',border:'3px solid #d7b56d'}}><div style={{width:'22px',height:'22px',display:'flex',borderRadius:'50%',border:'2px solid #e8ca81',boxShadow:'0 0 18px #d7b56d'}}/></div>,size)}
