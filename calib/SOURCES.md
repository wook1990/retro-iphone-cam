# Calibration sources

Downloaded originals are **not** in this repository. They live only in the local, gitignored `calib/raw/` folder. This file lists what was used, with URLs and licenses, so the fit can be reproduced.

The public app ships only the small derived files in `calib/out/` (`looks.json`, `lut.png`, `report.md`) and a copy of `lut.png` at the site root.

## GSMArena Photo Compare (internal fitting only)

Same-scene studio JPEGs from [GSMArena's Photo Compare tool](https://www.gsmarena.com/piccmp.php3). Full-resolution files were fetched from `https://fdn.gsmarena.com/vv/piccmp/{name}.jpg`.

These images are copyrighted by GSMArena / their respective publishers. They were used **only to fit tone, color, MTF, and noise** and to build an internal side-by-side. They are **not** redistributed here and must not be committed or published.

iPhone 13 shots of the same scenes were the modern sRGB reference the 17³ LUT maps from. Phone IDs: 5s 5685, SE (1st gen) 7969, 6s 7242, 7 8064, 8 8573, XS 9318, 13 11103, 14 11861.

| Model | Scene | File | EXIF |
|---|---|---|---|
| 5s | chart / ISO 12233 | `iphone-5s-1.jpg` | iPhone 5s, iOS 7.0.1, ISO 40, f/2.2, 4.12mm, 3264×2448 |
| 5s | older still life | `iphone-5s-2.jpg` | iPhone 5s, iOS 7.0.1, ISO 40, f/2.2, 4.12mm |
| 5s | older portrait collage | `iphone-5s-3.jpg` | iPhone 5s, iOS 7.0.1, ISO 32, f/2.2, 4.12mm |
| SE 1st | chart | `apple-iphone-se-1.jpg` | iPhone SE, iOS 9.3, ISO 25, f/2.2, 4.15mm, 4032×3024 |
| SE 1st | still life, day | `apple-iphone-se-2.jpg` | iPhone SE, iOS 9.3.1, ISO 25 |
| SE 1st | still life, low light | `apple-iphone-se-3.jpg` | iPhone SE, iOS 9.3.1, ISO 400 |
| 6s | chart | `apple-iphone-6s-1.jpg` | iPhone 6s, iOS 9.0.1, ISO 25, f/2.2, 4.15mm |
| 6s | older still life | `apple-iphone-6s-2.jpg` | iPhone 6s, iOS 9.0.1, ISO 50 |
| 6s | older portrait collage | `apple-iphone-6s-3.jpg` | iPhone 6s, iOS 9.0.1, ISO 32 |
| 6s | still life, day | `iphone-6s-4.jpg` | iPhone 6s, iOS 9.1, ISO 32 |
| 6s | still life, low light | `iphone-6s-5.jpg` | iPhone 6s, iOS 9.1, ISO 320 |
| 7 | chart | `apple-iphone-7-1.jpg` | iPhone 7, iOS 10.0.1, ISO 20, f/1.8, 3.99mm |
| 7 | still life, day | `apple-iphone-7-2.jpg` | iPhone 7, iOS 10.0.1, ISO 40 |
| 7 | still life, low light | `apple-iphone-7-3.jpg` | iPhone 7, iOS 10.0.1, ISO 100 |
| 8 | chart | `iphone8-1.jpg` | iPhone 8, iOS 11.0.1, ISO 20, f/1.8, 3.99mm |
| 8 | still life, day | `iphone8-2.jpg` | iPhone 8, iOS 11.0.1, ISO 25 |
| 8 | still life, low light | `iphone8-3.jpg` | iPhone 8, iOS 11.0.1, ISO 100 |
| XS | chart | `apple-iphone-xs-1.jpg` | iPhone XS, iOS 12.0, ISO 25, f/1.8, 4.25mm |
| XS | still life, day | `apple-iphone-xs-2.jpg` | iPhone XS, iOS 12.0, ISO 50 |
| XS | still life, low light | `apple-iphone-xs-3.jpg` | iPhone XS, iOS 12.0, ISO 640 |
| 13 (reference) | chart | `apple-iphone-13-1.jpg` | iPhone 13, iOS 15.0, ISO 32, f/1.6, 5.1mm |
| 13 (reference) | still life, day | `apple-iphone-13-2.jpg` | iPhone 13, iOS 15.0, ISO 40 |
| 13 (reference) | still life, low light | `apple-iphone-13-3.jpg` | iPhone 13, iOS 15.0, ISO 640 |
| 14 (check) | chart | `iphone-14-100.jpg` | iPhone 14, iOS 16.0.1, ISO 40, f/1.5, 5.7mm |
| 14 (check) | still life, day | `iphone-14-2.jpg` | iPhone 14, iOS 16.0.1, ISO 40 |
| 14 (check) | still life, low light | `iphone-14-3.jpg` | iPhone 14, iOS 16.0.1, ISO 500 |

**5s note:** GSMArena has no still-life or low-light frame of the later studio setup for the 5s. Color for 5s was fit from the shared resolution chart versus iPhone 13, composed with a 5s←6s LUT from the older studio and portrait scenes. Low-light noise for 5s also uses Wikimedia Commons high-ISO frames (up to ISO 320).

## Wikimedia Commons (CC-licensed, EXIF-confirmed)

Used for additional ISO/noise variety and as a pool of public-domain/CC originals. Filter: native still size (5s 3264×2448, others 4032×3024, either orientation), EXIF `Model` matching the phone, main-camera aperture and focal length (f/2.2 ~4.15mm for 5s/SE 1st/6s; f/1.8 3.99mm for 7/8; f/1.8 4.25mm for XS), Software not a third-party editor, 35mm-equivalent under 40mm (no digital zoom / telephoto). SE shots come from `Category:Taken with iPhone SE (1st generation)` only.

User-Agent used for the API crawl: `retro-iphone-cam-calib/1.0`.

### 5s  ([category](https://commons.wikimedia.org/wiki/Category:Taken_with_iPhone_5S))

| File | ISO | License | Author | Page |
|---|---|---|---|---|
| Boris Nemtsov's March 2324.JPG | 250 | CC BY-SA 4.0 | Pure Engineer | [page](https://commons.wikimedia.org/wiki/File:Boris_Nemtsov%27s_March_2324.JPG) |
| Boris Nemtsov's March 2322.JPG | 80 | CC BY-SA 4.0 | Pure Engineer | [page](https://commons.wikimedia.org/wiki/File:Boris_Nemtsov%27s_March_2322.JPG) |
| Berkeley Springs, WV State Park 2.JPG | 32 | CC BY-SA 4.0 | Jrmichae | [page](https://commons.wikimedia.org/wiki/File:Berkeley_Springs,_WV_State_Park_2.JPG) |
| Boris Nemtsov's March 2320.JPG | 320 | CC BY-SA 4.0 | Pure Engineer | [page](https://commons.wikimedia.org/wiki/File:Boris_Nemtsov%27s_March_2320.JPG) |
| Boris Nemtsov's March 2317.JPG | 100 | CC BY-SA 4.0 | Pure Engineer | [page](https://commons.wikimedia.org/wiki/File:Boris_Nemtsov%27s_March_2317.JPG) |
| Berkeley Springs, WV State Park.JPG | 32 | CC BY-SA 4.0 | Jrmichae | [page](https://commons.wikimedia.org/wiki/File:Berkeley_Springs,_WV_State_Park.JPG) |
| Mochi Tofu.jpg | 320 | CC BY-SA 4.0 | Chae Young Oh | [page](https://commons.wikimedia.org/wiki/File:Mochi_Tofu.jpg) |
| Boris Nemtsov's March 2318.JPG | 100 | CC BY-SA 4.0 | Pure Engineer | [page](https://commons.wikimedia.org/wiki/File:Boris_Nemtsov%27s_March_2318.JPG) |
| Boris Nemtsov's March 2258.JPG | 32 | CC BY-SA 4.0 | Pure Engineer | [page](https://commons.wikimedia.org/wiki/File:Boris_Nemtsov%27s_March_2258.JPG) |
| Voortrekker MonumentKat1.JPG | 320 | CC BY-SA 3.0 | User:Katangais | [page](https://commons.wikimedia.org/wiki/File:Voortrekker_MonumentKat1.JPG) |
| November 26, 2014 Storm - Morgan County, West Virginia.JPG | 100 | CC BY-SA 4.0 | Jrmichae | [page](https://commons.wikimedia.org/wiki/File:November_26,_2014_Storm_-_Morgan_County,_West_Virginia.JPG) |
| Boris Nemtsov's March 2259.JPG | 32 | CC BY-SA 4.0 | Pure Engineer | [page](https://commons.wikimedia.org/wiki/File:Boris_Nemtsov%27s_March_2259.JPG) |
| Voortrekker MonumentKat4.JPG | 320 | CC BY-SA 3.0 | User:Katangais | [page](https://commons.wikimedia.org/wiki/File:Voortrekker_MonumentKat4.JPG) |
| Unfinished Tecomate made of Alabaster.jpg | 125 | CC BY-SA 4.0 | PauloCalvo | [page](https://commons.wikimedia.org/wiki/File:Unfinished_Tecomate_made_of_Alabaster.jpg) |

### se  ([category](https://commons.wikimedia.org/wiki/Category:Taken_with_iPhone_SE_(1st_generation)))

| File | ISO | License | Author | Page |
|---|---|---|---|---|
| 路邊烤肉攤.jpg | 250 | CC BY-SA 4.0 | Husky221 | [page](https://commons.wikimedia.org/wiki/File:%E8%B7%AF%E9%82%8A%E7%83%A4%E8%82%89%E6%94%A4.jpg) |
| Nanjing East Road, Kinpo Building and China Development Building at night (31771840903).jpg | 80 | CC BY-SA 2.0 | Hsu Luke | [page](https://commons.wikimedia.org/wiki/File:Nanjing_East_Road,_Kinpo_Building_and_China_Development_Building_at_night_(31771840903).jpg) |
| End school zone, old Snow Route and No Parking signs (37800800945).jpg | 25 | CC BY 2.0 | Eric Fischer | [page](https://commons.wikimedia.org/wiki/File:End_school_zone,_old_Snow_Route_and_No_Parking_signs_(37800800945).jpg) |
| Museo Milavidan portaikko.jpg | 320 | CC BY-SA 4.0 | Iljanne | [page](https://commons.wikimedia.org/wiki/File:Museo_Milavidan_portaikko.jpg) |
| I-85 atlanta (31340809978).jpg | 25 | CC BY-SA 2.0 | US 89 | [page](https://commons.wikimedia.org/wiki/File:I-85_atlanta_(31340809978).jpg) |
| 1932 Leica II D CLa (32391858674).jpg | 500 | CC BY 2.0 | sébastien amiet;l | [page](https://commons.wikimedia.org/wiki/File:1932_Leica_II_D_CLa_(32391858674).jpg) |
| I-85 atlanta (31340810388).jpg | 25 | CC BY-SA 2.0 | US 89 | [page](https://commons.wikimedia.org/wiki/File:I-85_atlanta_(31340810388).jpg) |
| I-85 atlanta (43401785990).jpg | 25 | CC BY-SA 2.0 | US 89 | [page](https://commons.wikimedia.org/wiki/File:I-85_atlanta_(43401785990).jpg) |
| Ian and tent, 26 June 2018.jpg | 25 | CC BY 4.0 | Andykatib | [page](https://commons.wikimedia.org/wiki/File:Ian_and_tent,_26_June_2018.jpg) |
| Itoyokado yahashiraten 01.jpg | 25 | CC0 | Higa4 | [page](https://commons.wikimedia.org/wiki/File:Itoyokado_yahashiraten_01.jpg) |
| Itoyokado yahashiraten 02.jpg | 25 | CC0 | Higa4 | [page](https://commons.wikimedia.org/wiki/File:Itoyokado_yahashiraten_02.jpg) |
| Itoyokado yahashiraten 03.jpg | 25 | CC0 | Higa4 | [page](https://commons.wikimedia.org/wiki/File:Itoyokado_yahashiraten_03.jpg) |
| Looking at Doha through rear of camera lens.jpg | 25 | CC BY-SA 4.0 | ResDigital18 | [page](https://commons.wikimedia.org/wiki/File:Looking_at_Doha_through_rear_of_camera_lens.jpg) |
| Pakse Bridge 3.jpg | 25 | CC BY-SA 4.0 | Christophe95 | [page](https://commons.wikimedia.org/wiki/File:Pakse_Bridge_3.jpg) |

### 6s  ([category](https://commons.wikimedia.org/wiki/Category:Taken_with_iPhone_6S))

| File | ISO | License | Author | Page |
|---|---|---|---|---|
| Piec kaflowy, 11 listopada 25, Tykocin.jpg | 250 | CC BY 4.0 | PiotrMig | [page](https://commons.wikimedia.org/wiki/File:Piec_kaflowy,_11_listopada_25,_Tykocin.jpg) |
| Beacon Edge, Penrith - geograph.org.uk - 7858613.jpg | 100 | CC BY-SA 2.0 | Steven Brown | [page](https://commons.wikimedia.org/wiki/File:Beacon_Edge,_Penrith_-_geograph.org.uk_-_7858613.jpg) |
| -mypubliclandsroadtrip 2016- Whitetail Landing and Golden Currant (28802429316).jpg | 25 | Public domain | mypubliclands | [page](https://commons.wikimedia.org/wiki/File:-mypubliclandsroadtrip_2016-_Whitetail_Landing_and_Golden_Currant_(28802429316).jpg) |
| Kentang goreng, es krim, dan coffee.jpg | 800 | CC0 | Tisa0603 | [page](https://commons.wikimedia.org/wiki/File:Kentang_goreng,_es_krim,_dan_coffee.jpg) |
| Sate ayam dan ayam katsu.jpg | 125 | CC0 | Tisa0603 | [page](https://commons.wikimedia.org/wiki/File:Sate_ayam_dan_ayam_katsu.jpg) |
| 11 Listopada 25 w Tykocinie.jpg | 25 | CC BY 4.0 | PiotrMig | [page](https://commons.wikimedia.org/wiki/File:11_Listopada_25_w_Tykocinie.jpg) |
| Nasi ikan cahkalang.jpg | 200 | CC0 | Tisa0603 | [page](https://commons.wikimedia.org/wiki/File:Nasi_ikan_cahkalang.jpg) |
| A6 crossing the M6 near Hackthorpe - geograph.org.uk - 7861302.jpg | 25 | CC BY-SA 2.0 | Steven Brown | [page](https://commons.wikimedia.org/wiki/File:A6_crossing_the_M6_near_Hackthorpe_-_geograph.org.uk_-_7861302.jpg) |
| Piec kaflowy, Złota 13, Tykocin.jpg | 200 | CC BY 4.0 | PiotrMig | [page](https://commons.wikimedia.org/wiki/File:Piec_kaflowy,_Z%C5%82ota_13,_Tykocin.jpg) |
| A6 near Hackthorpe - geograph.org.uk - 7861307.jpg | 25 | CC BY-SA 2.0 | Steven Brown | [page](https://commons.wikimedia.org/wiki/File:A6_near_Hackthorpe_-_geograph.org.uk_-_7861307.jpg) |
| Pizza Limo 1 meter.jpg | 200 | CC0 | Tisa0603 | [page](https://commons.wikimedia.org/wiki/File:Pizza_Limo_1_meter.jpg) |
| A6 north of Garth Row - geograph.org.uk - 7861347.jpg | 25 | CC BY-SA 2.0 | Steven Brown | [page](https://commons.wikimedia.org/wiki/File:A6_north_of_Garth_Row_-_geograph.org.uk_-_7861347.jpg) |
| A6 towards Kendal - geograph.org.uk - 7861326.jpg | 25 | CC BY-SA 2.0 | Steven Brown | [page](https://commons.wikimedia.org/wiki/File:A6_towards_Kendal_-_geograph.org.uk_-_7861326.jpg) |
| A6 towards Kendal - geograph.org.uk - 7861329.jpg | 25 | CC BY-SA 2.0 | Steven Brown | [page](https://commons.wikimedia.org/wiki/File:A6_towards_Kendal_-_geograph.org.uk_-_7861329.jpg) |

### 7  ([category](https://commons.wikimedia.org/wiki/Category:Taken_with_iPhone_7))

| File | ISO | License | Author | Page |
|---|---|---|---|---|
| Construction Kvetinovy dum 104.jpg | 250 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_104.jpg) |
| Construction Kvetinovy dum 100.jpg | 80 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_100.jpg) |
| Apple Store at Parc Central.jpg | 20 | CC BY-SA 4.0 | そらみみ | [page](https://commons.wikimedia.org/wiki/File:Apple_Store_at_Parc_Central.jpg) |
| Construction Kvetinovy dum 105.jpg | 250 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_105.jpg) |
| Construction Kvetinovy dum 101.jpg | 80 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_101.jpg) |
| Colored whiteboard markers in case.jpg | 20 | CC BY-SA 4.0 | Schreibwaren-Upload | [page](https://commons.wikimedia.org/wiki/File:Colored_whiteboard_markers_in_case.jpg) |
| Construction Kvetinovy dum 106.jpg | 250 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_106.jpg) |
| Construction Kvetinovy dum 102.jpg | 80 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_102.jpg) |
| Colored whiteboard markers.jpg | 20 | CC BY-SA 4.0 | Schreibwaren-Upload | [page](https://commons.wikimedia.org/wiki/File:Colored_whiteboard_markers.jpg) |
| Construction Kvetinovy dum 108.jpg | 250 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_108.jpg) |
| Construction Kvetinovy dum 118.jpg | 80 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_118.jpg) |
| Construction Kvetinovy dum 110.jpg | 20 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_110.jpg) |
| Construction Kvetinovy dum 109.jpg | 250 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_109.jpg) |
| Construction Kvetinovy dum 147.jpg | 80 | CC0 | Perituss | [page](https://commons.wikimedia.org/wiki/File:Construction_Kvetinovy_dum_147.jpg) |

### 8  ([category](https://commons.wikimedia.org/wiki/Category:Taken_with_iPhone_8))

| File | ISO | License | Author | Page |
|---|---|---|---|---|
| Vue depuis le choeur église Charles de Blois.jpg | 80 | CC0 | SmgnumA | [page](https://commons.wikimedia.org/wiki/File:Vue_depuis_le_choeur_%C3%A9glise_Charles_de_Blois.jpg) |
| 3D-Modell Dom Bamberg.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:3D-Modell_Dom_Bamberg.jpg) |
| Spatzenhobel.jpg | 100 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Spatzenhobel.jpg) |
| Alte Hofhaltung Bamberg.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Alte_Hofhaltung_Bamberg.jpg) |
| Stadtbibliothek Nürnberg.jpg | 100 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Stadtbibliothek_N%C3%BCrnberg.jpg) |
| Altes Rathaus, Bamberg.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Altes_Rathaus,_Bamberg.jpg) |
| Apollontempel Nürnberg 2026-1.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Apollontempel_N%C3%BCrnberg_2026-1.jpg) |
| Apollontempel Nürnberg 2026-2.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Apollontempel_N%C3%BCrnberg_2026-2.jpg) |
| Ave Maria preserve.jpg | 20 | Public domain | Dmartin969 | [page](https://commons.wikimedia.org/wiki/File:Ave_Maria_preserve.jpg) |
| BRK Gebrauchtwaren Nürnberg.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:BRK_Gebrauchtwaren_N%C3%BCrnberg.jpg) |
| BRK Möbelverkauf Nürnberg.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:BRK_M%C3%B6belverkauf_N%C3%BCrnberg.jpg) |
| Bad Staffelstein Stadtturm 2026.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Bad_Staffelstein_Stadtturm_2026.jpg) |
| Bahnhofsmission Erlangen Flagge.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Bahnhofsmission_Erlangen_Flagge.jpg) |
| Bahnhofsmission Erlangen.jpg | 20 | CC BY-SA 4.0 | Chhelp | [page](https://commons.wikimedia.org/wiki/File:Bahnhofsmission_Erlangen.jpg) |

### xs  ([category](https://commons.wikimedia.org/wiki/Category:Taken_with_iPhone_XS))

| File | ISO | License | Author | Page |
|---|---|---|---|---|
| 새우깡 4종 비교 3.jpg | 250 | CC BY 4.0 | 녜이첼 | [page](https://commons.wikimedia.org/wiki/File:%EC%83%88%EC%9A%B0%EA%B9%A1_4%EC%A2%85_%EB%B9%84%EA%B5%90_3.jpg) |
| King County Aquatic Center competition natatorium - 23 November 2022.jpg | 100 | CC BY-SA 4.0 | Tanis Coralee Leonhardi | [page](https://commons.wikimedia.org/wiki/File:King_County_Aquatic_Center_competition_natatorium_-_23_November_2022.jpg) |
| A Coruña (49720903233).jpg | 25 | CC BY 2.0 | Sergei Gussev | [page](https://commons.wikimedia.org/wiki/File:A_Coru%C3%B1a_(49720903233).jpg) |
| 2025-12-30 Decoração Natalina em Angra dos Reis, 001.jpg | 400 | CC BY 4.0 | Minerva97 | [page](https://commons.wikimedia.org/wiki/File:2025-12-30_Decora%C3%A7%C3%A3o_Natalina_em_Angra_dos_Reis,_001.jpg) |
| Savory Breakfast Delight.jpg | 100 | CC BY 4.0 | Gwasheya | [page](https://commons.wikimedia.org/wiki/File:Savory_Breakfast_Delight.jpg) |
| A Coruña (49720903708).jpg | 25 | CC BY 2.0 | Sergei Gussev | [page](https://commons.wikimedia.org/wiki/File:A_Coru%C3%B1a_(49720903708).jpg) |
| 2025-12-30 Decoração Natalina em Angra dos Reis, 002.jpg | 400 | CC BY 4.0 | Minerva97 | [page](https://commons.wikimedia.org/wiki/File:2025-12-30_Decora%C3%A7%C3%A3o_Natalina_em_Angra_dos_Reis,_002.jpg) |
| 7-й проезд Марьиной Рощи.jpg | 125 | CC BY-SA 4.0 | Leokand | [page](https://commons.wikimedia.org/wiki/File:7-%D0%B9_%D0%BF%D1%80%D0%BE%D0%B5%D0%B7%D0%B4_%D0%9C%D0%B0%D1%80%D1%8C%D0%B8%D0%BD%D0%BE%D0%B9_%D0%A0%D0%BE%D1%89%D0%B8.jpg) |
| A Coruña (49720905633).jpg | 25 | CC BY 2.0 | Sergei Gussev | [page](https://commons.wikimedia.org/wiki/File:A_Coru%C3%B1a_(49720905633).jpg) |
| Cafe in Zhongshan.jpg | 400 | CC BY-SA 4.0 | 水餃喵 | [page](https://commons.wikimedia.org/wiki/File:Cafe_in_Zhongshan.jpg) |
| King County Aquatic Center competition pool and timing system - 23 November 2022.jpg | 125 | CC BY-SA 4.0 | Tanis Coralee Leonhardi | [page](https://commons.wikimedia.org/wiki/File:King_County_Aquatic_Center_competition_pool_and_timing_system_-_23_November_2022.jpg) |
| A Coruña (49720906423).jpg | 25 | CC BY 2.0 | Sergei Gussev | [page](https://commons.wikimedia.org/wiki/File:A_Coru%C3%B1a_(49720906423).jpg) |
| Piec kaflowy brązowy.jpg | 400 | CC BY-SA 4.0 | Pczempik | [page](https://commons.wikimedia.org/wiki/File:Piec_kaflowy_br%C4%85zowy.jpg) |
| Canon V-20 MSX computer (2).jpg | 200 | CC BY 2.0 | Karl Baron | [page](https://commons.wikimedia.org/wiki/File:Canon_V-20_MSX_computer_(2).jpg) |

