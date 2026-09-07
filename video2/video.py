#!/usr/bin/env python3
"""DO NOT PRESS PLAY. An animated public-service warning that goes very wrong."""
import argparse
import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
AUDIO = ROOT/'9dbc9663-e8ef-4bdf-a478-d2e8f524b861.m4a'
SHARED = ROOT.parent/'video'/'video.py'
if not SHARED.is_file():
    sys.exit('Missing ../video/video.py. Keep video/ and video2/ beside each other.')
spec = importlib.util.spec_from_file_location('duck_art', SHARED)
art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(art)
cairo, np, Image = art.cairo, art.np, art.Image
color, finish, rect, ellipse = art.color, art.finish, art.rect, art.ellipse
line, text, label, star = art.line, art.text, art.label, art.star
INK, PAPER = art.INK, art.PAPER
RED, LIME, CYAN, ORANGE = '#ff633d', '#ccf34f', '#8cdece', '#ffad42'
TAU = math.tau
SCENES = {'intro', 'opening', 'verse', 'count', 'chorus', 'whisper', 'beans',
          'verse2', 'ad', 'bridge', 'final', 'chant', 'glitch', 'outro'}


def play_button(c, x, y, s, t, e=0, sad=False):
    c.save()
    c.translate(x, y)
    c.rotate(math.sin(t*3)*(.025 if sad else .065))
    c.scale(s, s)
    for i, xx in enumerate((-65, 65)):
        lift = math.sin(t*7+i*math.pi)*e*15
        line(c, [(xx, 114), (xx, 176+lift), (xx+35, 182+lift)], INK, 15)
        ellipse(c, xx+16, 186+lift, 33, 13, PAPER, INK, 5)
    for sign in (-1, 1):
        yy = 33+math.sin(t*6+sign)*e*22
        line(c, [(sign*130, 11), (sign*182, yy), (sign*200, yy-32)], INK, 12)
        ellipse(c, sign*201, yy-39, 15, 21, PAPER, INK, 5)
    ellipse(c, 9, 16, 146, 146, INK)
    ellipse(c, 0, 0, 146, 146, PAPER, INK, 7)
    ellipse(c, 0, -3, 125, 125, RED, INK, 5)
    c.move_to(-92, -67)
    c.curve_to(-73, -104, -19, -124, 25, -103)
    finish(c, None, PAPER, 12)
    for xx in (-43, 39):
        if sad:
            line(c, [(xx-13, -35), (xx+13, -45)], INK, 7)
        else:
            ellipse(c, xx, -39, 17, 24, PAPER, INK, 4)
            ellipse(c, xx+4, -37, 7, 11, INK, None)
    line(c, [(-30, -6), (64, 44), (-30, 94)], INK, 5, True, PAPER)
    if sad:
        ellipse(c, 56, 8+math.sin(t)*5, 8, 17, CYAN, None)
    c.restore()


def bean(c, x, y, s, t, e=0, space=False):
    c.save()
    c.translate(x, y)
    c.rotate(math.sin(t*3)*.12)
    c.scale(s, s)
    if space:
        ellipse(c, -8, -8, 172, 181, PAPER, INK, 5)
        ellipse(c, -8, -8, 158, 167, CYAN, INK, 3)
    for i, xx in enumerate((-50, 38)):
        lift = math.sin(t*8+i*math.pi)*e*14
        line(c, [(xx, 100), (xx, 155+lift), (xx+27, 163+lift)], INK, 11)
    c.move_to(-76, 115)
    c.curve_to(-152, 72, -157, -54, -81, -117)
    c.curve_to(-22, -178, 85, -130, 110, -64)
    c.curve_to(153, 28, 24, -4, 45, 68)
    c.curve_to(66, 129, -21, 160, -76, 115)
    c.close_path()
    finish(c, LIME, INK, 7)
    c.move_to(-90, -62)
    c.curve_to(-80, -100, -44, -117, -17, -110)
    finish(c, None, PAPER, 11)
    for xx in (-48, 17):
        ellipse(c, xx, -45, 14, 20, PAPER, INK, 4)
        ellipse(c, xx+3, -42, 6, 10, INK, None)
    c.move_to(-44, -5)
    c.curve_to(-20, 19+e*12, 2, 17+e*12, 13, -8)
    finish(c, None, INK, 6)
    ellipse(c, -69, -3, 17, 9, RED, None)
    if space:
        ellipse(c, 103, -93, 17, 32, PAPER, None)
    c.restore()


def sun(c, x, y, r, t):
    for j in range(12):
        a = j*TAU/12+t*.18
        line(c, [(x+math.cos(a)*r*1.14, y+math.sin(a)*r*1.14),
                 (x+math.cos(a)*r*1.43, y+math.sin(a)*r*1.43)], ORANGE, 7)
    ellipse(c, x, y, r, r, LIME, INK, 5)
    for sign in (-1, 1):
        ellipse(c, x+sign*r*.32, y-r*.1, r*.08, r*.14, INK, None)
    line(c, [(x-r*.2, y+r*.32), (x+r*.2, y+r*.32)], INK, 4)


def object_art(c, kind, x, y, s, t, e):
    c.save()
    c.translate(x, y)
    c.rotate(math.sin(t*2)*.055)
    c.scale(s, s)
    if kind == 'fridge':
        for i, xx in enumerate((-72, 68)):
            line(c, [(xx, 153), (xx+math.sin(t*7+i*math.pi)*20, 217)], INK, 15)
            ellipse(c, xx+19, 220, 33, 12, INK, None)
        rect(c, -119, -173, 243, 341, PAPER, INK, 7, 20)
        line(c, [(-117, -47), (120, -47)], INK, 5)
        line(c, [(-85, -111), (-85, -72)], INK, 9)
        line(c, [(-85, -7), (-85, 52)], INK, 9)
        for xx in (-24, 46):
            ellipse(c, xx, -91, 10, 17, INK, None)
        label(c, 'WE NEED', 18, 68, 18, center=True)
        label(c, 'TO TALK.', 18, 95, 18, center=True)
        rect(c, 112, 56, 95, 104, ORANGE, INK, radius=8)
    elif kind == 'microwave':
        rect(c, -166, -104, 332, 225, PAPER, INK, 7, 19)
        rect(c, -141, -80, 220, 170, INK, INK, radius=10)
        sun(c, -33, 4, 50, t)
        rect(c, 94, -75, 54, 50, LIME, INK, 3, 4)
        text(c, '3', 121, -39, 33, center=True)
        ellipse(c, 122, 30, 21, 21, ORANGE, INK, 4)
        for xx in (-107, 107):
            line(c, [(xx, 121), (xx, 145)], INK, 13)
    elif kind == 'washer':
        rect(c, -128, -160, 256, 322, PAPER, INK, 7, 16)
        line(c, [(-126, -94), (126, -94)], INK, 5)
        for xx in (-86, -52, 89):
            ellipse(c, xx, -125, 10, 10, RED if xx == 89 else LIME, INK, 3)
        ellipse(c, 0, 36, 91, 91, INK, INK, 5)
        c.save()
        c.translate(0, 36)
        c.rotate(t*(1+e*2))
        bean(c, 0, 0, .43, t, e)
        c.restore()
        ellipse(c, 0, 36, 100, 100, None, CYAN, 10)
    elif kind == 'grandma':
        ellipse(c, 0, -144, 49, 41, PAPER, INK, 5)
        ellipse(c, 0, -83, 80, 81, PAPER, INK, 5)
        for xx in (-31, 31):
            ellipse(c, xx, -95, 23, 24, None, INK, 5)
            ellipse(c, xx, -92, 5, 7, INK, None)
        line(c, [(-8, -96), (8, -96)], INK, 5)
        c.move_to(-29, -55)
        c.curve_to(-11, -32, 13, -32, 28, -55)
        finish(c, None, INK, 5)
        line(c, [(-75, -20), (75, -20), (112, 94), (-112, 94)], INK, 5, True, CYAN)
        for sign in (-1, 1):
            line(c, [(sign*74, 9), (sign*133, 68), (sign*100, 100)], INK, 15)
        rect(c, -180, 80, 360, 129, INK, INK, radius=14)
        for xx in (-106, 105):
            ellipse(c, xx, 138, 40, 40, PAPER, None)
            ellipse(c, xx, 138, 13, 13, RED, None)
            line(c, [(xx, 138), (xx+math.cos(t*4)*32, 138+math.sin(t*4)*32)], INK, 4)
        for j in range(4):
            rect(c, -34+j*19, 103, 8, 49+math.sin(t*8+j)*13, LIME)
        label(c, 'GRANDMA / LIVE', 0, 192, 15, PAPER, center=True)
    elif kind == 'planet':
        ellipse(c, 0, 0, 109, 109, CYAN, INK, 6)
        for xx, yy, rx, ry in [(-41, -47, 39, 26), (47, -11, 31, 53), (-29, 63, 29, 20)]:
            ellipse(c, xx, yy, rx, ry, LIME, None)
        for xx in (-32, 33):
            ellipse(c, xx, -13, 7, 13, INK, None)
        ellipse(c, 0, -112, 84, 24, INK, INK)
        line(c, [(0, -128), (8, -147)], INK, 9)
        label(c, 'BONJOUR.', 0, 51, 23, center=True)
        c.save()
        c.rotate(-.25)
        ellipse(c, 0, 0, 182, 39, None, ORANGE, 12)
        c.restore()
    elif kind == 'pigeon':
        ellipse(c, -11, -9, 82, 107, CYAN, INK, 6)
        ellipse(c, 21, -97, 58, 61, PAPER, INK, 5)
        line(c, [(67, -113), (120, -86), (60, -74)], INK, 5, True, ORANGE)
        ellipse(c, 38, -111, 8, 11, INK, None)
        line(c, [(-91, 30), (64, 30), (94, 140), (-118, 140)], INK, 6, True, INK)
        line(c, [(-37, 35), (-1, 35), (-8, 95), (-33, 95)], None, 0, True, PAPER)
        line(c, [(97, 36), (155, 104)], INK, 10)
        rect(c, 112, 71, 94, 37, ORANGE, INK, 5, 9)
        label(c, 'OBJECTION.', -10, 188, 23, center=True)
    elif kind == 'chair':
        rect(c, -86, -126, 172, 163, PAPER, INK, 6, 20)
        rect(c, -121, 44, 242, 44, CYAN, INK, 6, 10)
        for xx in (-95, 95):
            line(c, [(xx, 84), (xx+xx*.16, 195)], INK, 13)
        rect(c, -31, -100, 62, 17, RED)
        rect(c, -9, -121, 18, 61, RED)
        for xx in (-31, 31):
            ellipse(c, xx, -22, 8, 13, INK, None)
        label(c, 'TAKE A SEAT.', 0, 235, 20, center=True)
    elif kind == 'god':
        line(c, [(0, -180), (178, 141), (-178, 141)], INK, 7, True, INK)
        ellipse(c, 0, -30, 76, 46, PAPER, INK, 5)
        ellipse(c, 0, -30, 26, 37, CYAN, INK, 5)
        ellipse(c, 0, -30, 12, 24, INK, None)
        rect(c, -115, 98, 230, 133, PAPER, INK, 5, 5)
        text(c, 'RENT DUE', 0, 143, 27, center=True)
        label(c, 'PAY IN HAIR', 0, 187, 21, center=True)
    elif kind == 'cat':
        line(c, [(-108, 62), (-102, -137), (-39, -80), (43, -80),
                 (102, -140), (112, 60)], INK, 6, True, ORANGE)
        ellipse(c, 0, 33, 112, 89, ORANGE, INK, 6)
        for xx in (-44, 44):
            ellipse(c, xx, -3, 22, 27, LIME, INK, 4)
            line(c, [(xx, -3), (185, -97+xx*.3)], RED, 9)
        line(c, [(-14, 30), (14, 30), (0, 46)], INK, 4, True, PAPER)
        for sign in (-1, 1):
            for yy in (40, 67):
                line(c, [(sign*72, yy), (sign*150, yy+9)], INK, 4)
    elif kind == 'croissant':
        c.move_to(-150, -85)
        c.curve_to(-27, -23, 40, -20, 151, -88)
        c.curve_to(162, 87, 90, 131, 0, 136)
        c.curve_to(-92, 124, -164, 52, -150, -85)
        c.close_path()
        finish(c, ORANGE, INK, 6)
        for xx in (-86, -28, 34, 91):
            line(c, [(xx, 4), (xx*.7, 100)], INK, 4)
        for xx in (-35, 35):
            ellipse(c, xx, 43, 6, 9, INK, None)
        line(c, [(-22, 76), (0, 88), (22, 76)], INK, 5)
        for yy in (-5, 38, 79):
            line(c, [(-182, yy), (-259-e*40, yy+15)], RED, 12)
    elif kind == 'moon':
        ellipse(c, 0, -13, 116, 116, PAPER, INK, 6)
        for xx, yy, rr in [(-51, -69, 26), (52, -65, 18), (-70, 38, 19)]:
            ellipse(c, xx, yy, rr, rr, ORANGE, None)
        for xx in (-25, 35):
            ellipse(c, xx, -17, 7, 12, INK, None)
        rect(c, -13, 70, 190, 117, LIME, INK, 5, 12)
        rect(c, 3, 93, 32, 24, ORANGE, INK, 2, 5)
        label(c, '**** 0317', 79, 152, 17, center=True)
    elif kind == 'clock':
        ellipse(c, 0, 0, 126, 126, PAPER, INK, 7)
        for j in range(12):
            a=j*TAU/12
            ellipse(c, math.sin(a)*105, -math.cos(a)*105, 4, 4, INK, None)
        line(c, [(0, 0), (0, -65)], INK, 7)
        art.prop(c, 'banana', 11, 4, .7, t)
        label(c, 'QUARTER PAST BANANA', 0, 171, 17, center=True)
    elif kind == 'shoe':
        line(c, [(-108, -110), (30, -110), (40, 14), (130, 51), (141, 95),
                 (-120, 95)], INK, 6, True, ORANGE)
        rect(c, -126, 92, 276, 25, PAPER, INK, 5, 8)
        for yy in (-69, -30, 9):
            line(c, [(-32, yy), (21, yy)], PAPER, 8)
        text(c, 'x7', 0, 175, 48, center=True)
    elif kind == 'cult':
        line(c, [(0, -187), (-134, 43), (134, 43)], INK, 6, True, LIME)
        ellipse(c, 0, -46, 51, 29, PAPER, INK, 5)
        ellipse(c, 0, -46, 14, 23, INK, None)
        art.router(c, 0, 170, .85, t)
    elif kind == 'human':
        rect(c, -159, -170, 318, 344, PAPER, INK, 7, 23)
        rect(c, -135, -143, 270, 212, CYAN, INK, 4, 11)
        for xx in (-51, 51):
            rect(c, xx-27, -83, 54, 66, INK, None, radius=8)
        line(c, [(-48, 23), (48, 23)], INK, 8)
        rect(c, -126, 99, 42, 42, LIME, INK, 3, 6)
        line(c, [(-117, 120), (-107, 131), (-90, 110)], INK, 4)
        label(c, 'HUMAN?', 30, 130, 31, center=True)
    elif kind == 'scream':
        ellipse(c, 0, 0, 136, 164, ORANGE, INK, 7)
        for xx in (-48, 48):
            ellipse(c, xx, -56, 23, 30, PAPER, INK, 4)
            ellipse(c, xx, -53, 7, 14, INK, None)
        ellipse(c, 0, 50, 64, 78+e*8, INK, INK)
        ellipse(c, 0, 90, 35, 24, RED, None)
    elif kind == 'duck':
        art.duck(c, 0, 0, .8, t, e, 'cool')
    elif kind in ('toaster', 'cactus', 'horse', 'spoon'):
        art.prop(c, kind, 0, 0, 1, t, e)
    elif kind == 'bean':
        bean(c, 0, 0, 1, t, e, space=True)
    else:
        play_button(c, 0, 0, 1, t, e)
    c.restore()


def fit_lines(c, value, max_width, max_height, size=124, max_lines=4):
    value = value.translate(str.maketrans({'\u2019': "'", '\u201c': '', '\u201d': '', '\u2014': ''}))
    c.select_font_face('DejaVu Sans', cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    for _ in range(60):
        c.set_font_size(size)
        rows=[]
        for paragraph in value.split('\n'):
            row=''
            for word in paragraph.split():
                candidate=(row+' '+word).strip()
                if row and c.text_extents(candidate).width > max_width:
                    rows.append(row)
                    row=word
                else:
                    row=candidate
            if row:
                rows.append(row)
        if len(rows)<=max_lines and len(rows)*size*1.09<=max_height and all(c.text_extents(r).width<=max_width for r in rows):
            break
        size*=.94
    assert rows and len(rows)<=max_lines and len(rows)*size*1.09<=max_height
    assert all(c.text_extents(r).width<=max_width for r in rows)
    return rows,size


class Film(art.Film):
    def backdrop(self, t, mode, e):
        c=self.c
        dark=mode in ('intro','whisper','bridge','glitch','outro','ad')
        bg=INK if dark else RED if mode in ('opening','final') else LIME if mode=='beans' else PAPER
        rect(c,0,0,1920,1080,bg)
        if mode in ('beans','opening','chorus','final','chant'):
            cx,cy=(960,485) if mode in ('beans','final','chant') else (1435,485)
            c.save()
            c.translate(cx,cy)
            c.rotate(t*.055)
            for j in range(22):
                a=j*TAU/22
                line(c,[(0,0),(2500*math.cos(a),2500*math.sin(a)),
                        (2500*math.cos(a+.075),2500*math.sin(a+.075))],None,0,True,
                     PAPER if mode in ('opening','final') else ORANGE if mode=='beans' else LIME)
            c.restore()
        elif dark:
            for px,py,speed,size,phase in self.particles:
                xx=(px*2100-t*(4+speed*13))%2100-90
                yy=145+py*740
                color(c,PAPER,.22+.55*(.5+.5*math.sin(t*.8+phase*TAU)))
                c.new_sub_path()
                c.arc(xx,yy,1+size*2,0,TAU)
                c.fill()
        else:
            for xx in range(40,1930,100):
                line(c,[(xx,100),(xx,950)],INK,.55)
            for yy in range(145,950,100):
                line(c,[(0,yy),(1920,yy)],INK,.55)
            ellipse(c,1430,498,379+e*12,379+e*12,CYAN,INK,3)
            ellipse(c,1430,498,348+e*12,348+e*12,None,INK,2)
        if not dark:
            c.save()
            c.set_source(self.pattern)
            c.paint_with_alpha(.22)
            c.restore()
        if mode in ('beans','chorus','opening','final','chant'):
            for i,(px,py,speed,size,phase) in enumerate(self.particles[:38]):
                xx=(px*2080+t*(18+speed*42))%2080-80
                yy=(py*1050+t*(27+speed*24))%1000
                star(c,xx,yy,4+size*11,[INK,CYAN,RED,PAPER][i%4],t*.3+phase*TAU)
        return dark,bg

    def headline(self, t, cue, fg, centered=False):
        c=self.c
        value=cue['text'] or ('DO NOT\nPRESS PLAY' if cue['scene']=='intro' else 'SIGNAL LOST')
        mode=cue['scene']
        rows,size=fit_lines(c,value.upper(),1680 if centered else 855,480 if centered else 500,
                           168 if centered else 115)
        elapsed=max(0,t-cue['start'])
        enter=1-(1-min(1,elapsed/.18))**3
        x=960 if centered else 95-35*(1-enter)
        top=(570 if centered else 495)-(len(rows)-1)*size*1.09/2
        for i,row in enumerate(rows):
            yy=top+i*size*1.09
            fill=fg
            if i==len(rows)-1 and mode not in ('intro','bridge','whisper','glitch','outro','ad'):
                width=c.text_extents(row).width
                rect(c,x-width/2-13 if centered else x-12,yy-size*.82,width+27,size*1.02,INK,radius=4)
                fill=LIME if mode!='beans' else PAPER
            text(c,row,x,yy,size,fill,center=centered,max_width=1700 if centered else 865)

    def billing(self,t,e):
        c=self.c
        x,y=1090,205
        rect(c,x+16,y+17,688,651,RED,INK,5,16)
        rect(c,x,y,688,651,PAPER,INK,6,16)
        rect(c,x+3,y+3,682,67,LIME,INK,3,12)
        label(c,'UNIVERSE+ / LIMITED OFFER',x+27,y+44,24)
        text(c,'CHORUS LOCKED',x+344,y+135,48,center=True)
        play_button(c,x+344,y+282,.65,t,e)
        label(c,'1 EMOTIONAL DAMAGE',x+344,y+447,29,center=True)
        rect(c,x+102,y+483,484,82,INK,None,radius=12)
        text(c,'INSERT FEELINGS',x+344,y+535,30,LIME,center=True)
        label(c,'NO REFUNDS. EVER.',x+344,y+612,19,center=True)
        coin_y=y+224+(t*53)%140
        ellipse(c,x+583,coin_y,29,29,ORANGE,INK,4)
        text(c,'!',x+583,coin_y+12,33,center=True)

    def bean_party(self,t,e,cue):
        c=self.c
        for j in range(10):
            xx=127+j*186
            yy=354+math.sin(t*5+j)*35
            bean(c,xx,yy,.45+(j%3)*.09,t+j,e,j%3==0)
        if 'washing' in cue['text'].lower() or 'existential' in cue['text'].lower():
            object_art(c,'washer',960,456,1.25,t,e)
        else:
            bean(c,960,451,1.15+e*.08,t,e,space=True)
        rows,size=fit_lines(c,cue['text'].upper(),1690,280,200,3)
        top=791-(len(rows)-1)*size*1.05/2
        for i,row in enumerate(rows):
            text(c,row,960,top+i*size*1.05,size,INK,center=True)
        label(c,'CERTIFIED INTERGALACTIC LEGUMES',960,167,25,center=True)

    def illustration(self,t,cue,e):
        c=self.c
        mode=cue['scene']
        kind=cue.get('prop','button')
        if mode=='intro':
            rect(c,1110,227,638,601,PAPER,INK,6,27)
            label(c,'THIS IS YOUR LAST WARNING',1429,282,23,center=True)
            pressed=kind=='pressed'
            play_button(c,1429,521 if pressed else 506,1.08 if pressed else 1.15,t,e)
            if pressed:
                line(c,[(1468,536),(1468,656),(1493,633),(1516,678),(1536,668),
                        (1513,626),(1548,621)],INK,5,True,PAPER)
            label(c,'TOO LATE.' if pressed else 'DO NOT TOUCH',1429,786,26,center=True)
            return
        if mode=='ad':
            self.billing(t,e)
            return
        if mode=='bridge':
            for r in (217,319,433):
                c.save()
                c.translate(1420,507)
                c.rotate(-.35)
                ellipse(c,0,0,r,r*.59,None,'#466051',2)
                c.restore()
            ellipse(c,1420,505,141,141,CYAN,None)
            play_button(c,1420,500,.45,t*.3,e*.2)
            star(c,1564,228,30,LIME,t*.2)
            label(c,'ONE RIDICULOUS MARK',1420,814,23,PAPER,center=True)
            return
        if mode=='glitch':
            jitter=math.sin(t*29)*e*6
            rect(c,1080+jitter,198,681,667,PAPER,INK,6,13)
            rect(c,1083+jitter,201,675,65,RED,INK,3,9)
            label(c,'SONG.EXE / SENTIENCE DETECTED',1105+jitter,243,21)
            play_button(c,1420+jitter,509,1.15,t*.6,e*.3,sad=True)
            label(c,'PLEASE STOP THE PLAYBACK',1420+jitter,804,23,center=True)
            for j in range(5):
                yy=290+(t*45+j*101)%435
                rect(c,1093,yy,653,2,CYAN)
            return
        if mode=='count':
            number=cue.get('number','?')
            text(c,number,1430,655,430,INK,center=True)
            stamp='BANKRUPT' if number=='4' else 'VERIFIED' if number=='7' else 'COUNTING IS HARD'
            c.save()
            c.translate(1430,739)
            c.rotate(-.09)
            rect(c,-255,-40,510,80,RED if number=='4' else LIME,INK,4,8)
            text(c,stamp,0,13,39,center=True)
            c.restore()
            return
        if mode=='outro':
            play_button(c,1420,503,.75,t*.3,0,sad=True)
            label(c,'REPLAY AT YOUR OWN RISK',1420,826,24,PAPER,center=True)
            return
        if kind=='scream':
            for r in (238,294,354):
                ellipse(c,1420,503,r+e*18,r+e*18,None,INK,3)
        ellipse(c,1420,847,220,22,INK,None)
        object_art(c,kind,1420,503-math.sin(t*6)*e*13,1.65 if kind=='grandma' else 1.7,t,e)

    def frame(self,t):
        c=self.c
        c.save()
        c.scale(self.width/1920,self.height/1080)
        c.set_line_cap(cairo.LINE_CAP_ROUND)
        c.set_line_join(cairo.LINE_JOIN_ROUND)
        idx,cue,_=self.cue_at(t)
        mode=cue['scene']
        ai=min(len(self.envelope)-1,max(0,round(t*30)))
        e=float(self.envelope[ai])
        dark,bg=self.backdrop(t,mode,e)
        fg=PAPER if dark else INK
        label(c,cue['tag'],97,171,23,LIME if dark else INK)
        rect(c,97,194,64,7,RED if dark else INK)
        if mode=='beans':
            # The party has its own centered title, not the regular section label.
            rect(c,0,119,1920,89,bg)
            self.bean_party(t,e,cue)
        elif mode=='whisper':
            bean(c,1440,539,.28,t*.5,0)
            self.headline(t,cue,PAPER)
            label(c,'PLEASE USE YOUR INSIDE VOICE',97,821,25,CYAN)
        elif mode=='final' and len(cue['text'])<23:
            kind=cue.get('prop','button')
            for i in range(8):
                bean(c,140+i*230,376+math.sin(t*5+i)*30,.37,t+i,e,i%3==0)
            object_art(c,kind,960,420,1.15,t,e)
            text(c,cue['text'].upper(),960,814,234,PAPER,center=True,max_width=1690,outline=INK)
        elif mode=='chant':
            for j in range(3):
                label(c,'WORDS NOT FOUND / WORDS NOT FOUND / WORDS NOT FOUND',
                      -120+(t*25)%150,240+j*253,49,RED)
            self.headline(t,cue,INK,centered=True)
        else:
            self.illustration(t,cue,e)
            self.headline(t,cue,fg)
        if mode not in ('beans','chant','final','whisper'):
            rect(c,81,893,1758,50,INK,None,radius=7)
            label(c,cue['text'].replace('\u2014',',').replace('\n',' '),103,927,25,PAPER,max_width=1711)
        # Fixed broadcast frame. No rapid full-screen brightness inversions.
        rect(c,0,0,1920,106,INK)
        ellipse(c,70,53,12,12,RED,None)
        line(c,[(66,46),(77,53),(66,60)],None,0,True,PAPER)
        text(c,'DO NOT PRESS PLAY',100,64,31,PAPER)
        label(c,'AN EXTREMELY BAD IDEA / VOL.02',616,60,18,LIME)
        label(c,cue['section'].upper(),1446,61,21,PAPER,max_width=306)
        label(c,f'{idx+1:03}',1794,61,22,LIME)
        rect(c,0,965,1920,115,INK)
        for j in range(34):
            xx=j*70-(t*45)%140
            line(c,[(xx,965),(xx+18,985),(xx+50,985),(xx+32,965)],None,0,True,RED)
        label(c,'PLAYBACK CANNOT BE UNDONE',65,1034,21,PAPER)
        for j,value in enumerate(self.spectrum[ai]):
            h=5+float(value)*47
            rect(c,654+j*19,1047-h,11,h,LIME if j%4 else RED,radius=3)
        seconds=int(self.duration)
        label(c,f'{int(t)//60:02}:{int(t)%60:02} / {seconds//60:02}:{seconds%60:02}',1555,1033,26,PAPER)
        rect(c,0,1074,1920*min(1,t/self.duration),6,LIME)
        if idx and self.cues[idx-1]['scene']!=mode:
            dt=t-cue['start']
            if 0<=dt<.18:
                rect(c,1920*(dt/.18),106,140,859,INK)
        if t>self.duration-.65:
            color(c,INK,min(1,(t-self.duration+.65)/.5))
            c.paint()
        c.restore()
        self.surface.flush()
        return self.surface


def storyboard(film,output):
    selected=[]
    for cue in film.cues:
        key=(cue['scene'],cue.get('prop','button'))
        if cue['scene'] not in [entry[0][0] for entry in selected]:
            selected.append((key,(cue['start']+cue['end'])/2))
    grandma=next(c for c in film.cues if c.get('prop')=='grandma')
    selected.append((('verse','grandma'),(grandma['start']+grandma['end'])/2))
    selected.sort(key=lambda entry:entry[1])
    sheet=Image.new('RGB',(1920,math.ceil(len(selected)/3)*390),INK)
    draw=art.ImageDraw.Draw(sheet)
    for i,(key,t) in enumerate(selected):
        surface=film.frame(t)
        image=Image.frombuffer('RGB',(film.width,film.height),surface.get_data(),
                               'raw','BGRX',surface.get_stride(),1).copy().resize((640,360),Image.Resampling.LANCZOS)
        x,y=(i%3)*640,(i//3)*390
        sheet.paste(image,(x,y))
        draw.text((x+12,y+370),f'{t:.2f}s / {key[0]} / {key[1]}',fill='white')
    sheet.save(output)
    print(f'Storyboard: {output}')


def main():
    parser=argparse.ArgumentParser(description=__doc__,epilog=(
        'Uses ../video/video.py for drawing primitives and audio analysis. '
        'Requires Python, Pycairo, NumPy, Pillow, FFmpeg and DejaVu fonts. '
        'Lyric timing follows this recording; estimated ad-libs are marked in lyrics.cues.json.'))
    parser.add_argument('-o','--output',type=Path,default=ROOT/'do-not-press-play.mp4')
    parser.add_argument('--width',type=int,default=1920)
    parser.add_argument('--fps',type=int,default=30)
    parser.add_argument('--start',type=float,default=0)
    parser.add_argument('--duration',type=float)
    parser.add_argument('--preview',action='store_true',help='960x540, 24fps, 12 seconds')
    parser.add_argument('--check',action='store_true',help='Validate every cue and draw storyboard.jpg')
    parser.add_argument('--force',action='store_true',help='Explicitly permit replacing an existing output')
    args=parser.parse_args()
    if args.preview:
        args.width,args.fps=960,24
        args.duration=12 if args.duration is None else args.duration
        if args.output==ROOT/'do-not-press-play.mp4':
            args.output=ROOT/'preview.mp4'
    if args.width<320 or args.width%32 or not 1<=args.fps<=60:
        parser.error('Width must be >=320 and a multiple of 32; FPS must be 1..60.')
    if not math.isfinite(args.start) or args.start<0:
        parser.error('Start must be nonnegative and finite.')
    if args.duration is not None and (not math.isfinite(args.duration) or args.duration<=0):
        parser.error('Duration must be positive and finite.')
    output=(ROOT/'storyboard.jpg') if args.check else args.output.expanduser().resolve()
    protected={p.resolve() for p in ROOT.iterdir() if p.suffix in ('.py','.sh','.m4a','.md','.json')}
    protected.add(SHARED.resolve())
    if output.resolve() in protected:
        parser.error('Refusing to overwrite source files.')
    if output.exists() and not args.force:
        parser.error(f'{output} exists. Use another path or explicitly pass --force.')
    if not output.parent.is_dir():
        parser.error('Output directory does not exist.')
    if not args.check and output.suffix.lower()!='.mp4':
        parser.error('Output must have an .mp4 extension.')
    duration,envelope,spectrum=art.analyze_audio(AUDIO)
    if args.start>=duration:
        parser.error('Start is beyond the audio.')
    length=min(args.duration if args.duration is not None else duration,duration-args.start)
    cues=art.load_cues(duration,ROOT/'lyrics.cues.json',ROOT/'lyrics.md')
    assert cues and cues[0]['start']==0 and abs(cues[-1]['end']-duration)<.1
    assert all(c['scene'] in SCENES for c in cues)
    assert all(abs(a['end']-b['start'])<.001 for a,b in zip(cues,cues[1:]))
    film=Film(args.width,args.width*9//16,cues,duration,envelope,spectrum)
    if args.check:
        assert np.ptp(envelope)>.1 and np.isfinite(spectrum).all()
        for cue in cues:
            film.frame((cue['start']+cue['end'])/2)
            film.frame(cue['start'])
        storyboard(film,output)
        print(f'PASS: {len(cues)} cues; every start and midpoint rendered; text bounds checked.')
        return
    audio_codec=['-c:a','copy'] if args.start==0 and length==duration else ['-c:a','aac','-b:a','192k']
    command=['ffmpeg','-hide_banner','-loglevel','warning','-y' if args.force else '-n',
             '-f','rawvideo','-pixel_format','bgr0','-video_size',f'{film.width}x{film.height}',
             '-framerate',str(args.fps),'-i','pipe:0','-ss',str(args.start),'-i',str(AUDIO),
             '-map','0:v:0','-map','1:a:0','-t',str(length),'-c:v','libx264','-preset','veryfast',
             '-crf','18','-threads','2','-pix_fmt','yuv420p',*audio_codec,'-movflags','+faststart',
             '-metadata','title=DO NOT PRESS PLAY',str(output)]
    print(f'Rendering {length:.3f}s / {film.width}x{film.height} / {args.fps}fps -> {output}',flush=True)
    process=subprocess.Popen(command,stdin=subprocess.PIPE)
    try:
        frames=math.ceil(length*args.fps)
        for i in range(frames):
            process.stdin.write(film.frame(args.start+i/args.fps).get_data())
            if i%(args.fps*5)==0:
                print(f'{100*i/frames:5.1f}% / {i/args.fps:.0f}s of {length:.0f}s',flush=True)
        process.stdin.close()
        if process.wait():
            raise RuntimeError('FFmpeg failed. Partial output retained for inspection.')
    except BaseException:
        if process.poll() is None:
            process.terminate()
        process.wait()
        raise
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]))
    v=next(s for s in info['streams'] if s['codec_type']=='video')
    assert (v['width'],v['height'],v['pix_fmt'])==(film.width,film.height,'yuv420p')
    assert any(s['codec_type']=='audio' for s in info['streams'])
    assert abs(float(info['format']['duration'])-length)<.15
    print(f'VERIFIED: {output} / {info["format"]["duration"]}s',flush=True)


if __name__=='__main__':
    main()
