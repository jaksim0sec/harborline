from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np, colorsys

ASSET_PARAMS={
 'harbor':dict(color=0.88,contrast=0.96,blur=0.07,warm=0.08,roof_mix=0.18,roof_sat=0.88,blue_sat=1.0,light_top=1.08,light_bottom=0.93,base_shade=0.06),
 'farm':dict(color=0.90,contrast=0.95,blur=0.06,warm=0.05,roof_mix=0.10,roof_sat=0.86,blue_sat=1.0,light_top=1.08,light_bottom=0.92,base_shade=0.05),
 'sawmill':dict(color=0.89,contrast=0.95,blur=0.08,warm=0.07,roof_mix=0.22,roof_sat=0.84,blue_sat=1.0,light_top=1.08,light_bottom=0.92,base_shade=0.07),
 'home':dict(color=0.95,contrast=0.97,blur=0.04,warm=0.05,roof_mix=0.18,roof_sat=0.90,blue_sat=1.0,light_top=1.07,light_bottom=0.94,base_shade=0.05),
 'bakery':dict(color=0.93,contrast=0.97,blur=0.05,warm=0.05,roof_mix=0.14,roof_sat=0.90,blue_sat=0.86,light_top=1.07,light_bottom=0.94,base_shade=0.05),
}


def rgb_to_hsv_arr(rgb: np.ndarray) -> np.ndarray:
    flat=rgb.reshape(-1,3)
    hsv=np.array([colorsys.rgb_to_hsv(*px) for px in flat],dtype=np.float32)
    return hsv.reshape(rgb.shape)

def hsv_to_rgb_arr(hsv: np.ndarray) -> np.ndarray:
    flat=hsv.reshape(-1,3)
    rgb=np.array([colorsys.hsv_to_rgb(*px) for px in flat],dtype=np.float32)
    return rgb.reshape(hsv.shape)

def harmonize(src: Path, dest: Path, p: dict) -> None:
    img=Image.open(src).convert('RGBA')
    blur=np.array(img.filter(ImageFilter.GaussianBlur(radius=0.6)),dtype=np.float32)/255.0
    arr=np.array(img,dtype=np.float32)/255.0
    alpha=arr[...,3:4]
    rgb=arr[...,:3]
    rgb=rgb*(1-p['blur'])+blur[...,:3]*p['blur']
    hsv=rgb_to_hsv_arr(np.clip(rgb,0,1))
    hsv[...,1]*=p['color']
    roof=((hsv[...,0]>=0.02)&(hsv[...,0]<=0.12)&(hsv[...,1]>0.22)&(alpha[...,0]>0.15))
    hsv[...,0]=np.where(roof,hsv[...,0]*(1-p['roof_mix'])+0.075*p['roof_mix'],hsv[...,0])
    hsv[...,1]=np.where(roof,hsv[...,1]*p['roof_sat'],hsv[...,1])
    cool=((hsv[...,0]>=0.48)&(hsv[...,0]<=0.62)&(hsv[...,1]>0.18)&(alpha[...,0]>0.15))
    hsv[...,1]=np.where(cool,hsv[...,1]*p['blue_sat'],hsv[...,1])
    rgb=hsv_to_rgb_arr(np.clip(hsv,0,1))
    hsv2=rgb_to_hsv_arr(np.clip(rgb,0,1))
    wall=((hsv2[...,1]<0.30)&(hsv2[...,2]>0.20)&(alpha[...,0]>0.2))
    warm=np.array([0.79,0.68,0.56],dtype=np.float32)
    rgb=np.where(wall[...,None],rgb*(1-p['warm'])+warm*p['warm'],rgb)
    mask=alpha[...,0]>0.05
    ys,xs=np.where(mask)
    y0,y1=ys.min(),ys.max(); x0,x1=xs.min(),xs.max()
    X=np.tile(np.linspace(0,1,mask.shape[1],dtype=np.float32),(mask.shape[0],1))
    Y=np.tile(np.linspace(0,1,mask.shape[0],dtype=np.float32)[:,None],(1,mask.shape[1]))
    xn=np.clip((X - x0/max(1,mask.shape[1]-1))/max((x1-x0)/max(1,mask.shape[1]-1),1e-6),0,1)
    yn=np.clip((Y - y0/max(1,mask.shape[0]-1))/max((y1-y0)/max(1,mask.shape[0]-1),1e-6),0,1)
    light = p['light_bottom'] + (1-(0.62*xn+0.38*yn))*(p['light_top']-p['light_bottom'])
    base=np.clip((yn-0.78)/0.22,0,1)
    light*=1 - p['base_shade']*base
    rgb=np.clip(rgb*light[...,None],0,1)
    rgb=np.clip((rgb-0.5)*p['contrast']+0.5,0,1)
    out=np.dstack([rgb,alpha])
    dest.parent.mkdir(parents=True,exist_ok=True)
    Image.fromarray((out*255+0.5).astype('uint8'),'RGBA').save(dest)

def main() -> None:
    asset_dir=Path('assets/textures')
    for name,p in ASSET_PARAMS.items():
        harmonize(asset_dir/f'{name}.png',asset_dir/f'{name}.png',p)

if __name__=='__main__':
    main()
