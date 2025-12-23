/**
 * Calculate 1-night rates from existing night rates
 *
 * Algorithm: The pricing system uses decay^n where decay = (p5/p1)^0.25
 * Working backwards: p1 = p2 / decay, where decay can be estimated from consecutive rates
 */

const listings = [
  { _id: '1586391635116x113503727348350980', rate_2: 0.0, rate_3: 336.0, rate_4: 252.0, rate_5: 201.25, rate_7: 143.745 },
  { _id: '1586447992720x748691103167545300', rate_2: 0.0, rate_3: 437.5, rate_4: 350.0, rate_5: 218.75, rate_7: 156.2575 },
  { _id: '1635393794574x767955910482578800', rate_2: 367.5, rate_3: 287.0, rate_4: 215.25, rate_5: 171.5, rate_7: 0.0 },
  { _id: '1637349440736x622780446630946800', rate_2: 280.0, rate_3: 262.5, rate_4: 196.0, rate_5: 157.5, rate_7: 0.0 },
  { _id: '1637349462975x979571797111503900', rate_2: 376.25, rate_3: 353.5, rate_4: 264.25, rate_5: 211.75, rate_7: 211.75 },
  { _id: '1637349482078x925018723387062800', rate_2: 437.5, rate_3: 355.25, rate_4: 266.0, rate_5: 213.5, rate_7: 213.5 },
  { _id: '1637766464825x314904261795779140', rate_2: 455.0, rate_3: 378.0, rate_4: 283.5, rate_5: 225.75, rate_7: 225.75 },
  { _id: '1637766465197x598529624673451800', rate_2: 402.5, rate_3: 371.0, rate_4: 278.25, rate_5: 222.25, rate_7: 222.25 },
  { _id: '1637766467338x392186493055059600', rate_2: 306.25, rate_3: 262.5, rate_4: 227.5, rate_5: 175.0, rate_7: 175.0 },
  { _id: '1655828589260x266041618201313280', rate_2: 350.0, rate_3: 327.25, rate_4: 246.75, rate_5: 196.0, rate_7: 196.0 },
  { _id: '1656608122982x964980286830411800', rate_2: 437.5, rate_3: 393.75, rate_4: 350.0, rate_5: 306.25, rate_7: 0.0 },
  { _id: '1690309054367x709388074557112300', rate_2: 787.5, rate_3: 665.0, rate_4: 507.5, rate_5: 402.5, rate_7: 0.0 },
  { _id: '1692811003339x451849759330148900', rate_2: 787.5, rate_3: 350.0, rate_4: 393.75, rate_5: 498.75, rate_7: 498.75 },
  { _id: '1699541256004x803742034165653800', rate_2: 350.0, rate_3: 343.0, rate_4: 257.25, rate_5: 204.75, rate_7: 204.75 },
  { _id: '1699644353626x202639020013649920', rate_2: 350.0, rate_3: 315.0, rate_4: 280.0, rate_5: 245.0, rate_7: 175.0 },
  { _id: '1699649954494x946752243203833900', rate_2: 560.0, rate_3: 490.0, rate_4: 437.5, rate_5: 367.5, rate_7: 367.5 },
  { _id: '1700160484034x560364847502983200', rate_2: 551.25, rate_3: 505.3125, rate_4: 490.0, rate_5: 474.6875, rate_7: 0.0 },
  { _id: '1700164735519x578425563717304300', rate_2: 323.75, rate_3: 315.0, rate_4: 306.25, rate_5: 262.5, rate_7: 0.0 },
  { _id: '1700165915338x204257664584122370', rate_2: 350.0, rate_3: 341.25, rate_4: 280.0, rate_5: 253.75, rate_7: 0.0 },
  { _id: '1700167658334x547491229030154240', rate_2: 437.5, rate_3: 332.5, rate_4: 262.5, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1700274970708x990272549765513200', rate_2: 245.0, rate_3: 227.5, rate_4: 210.0, rate_5: 192.5, rate_7: 192.5 },
  { _id: '1700279439640x114700559393488900', rate_2: 297.5, rate_3: 280.0, rate_4: 262.5, rate_5: 245.0, rate_7: 245.0 },
  { _id: '1701095542557x452891458991554560', rate_2: 218.75, rate_3: 201.25, rate_4: 192.5, rate_5: 189.0, rate_7: 134.995 },
  { _id: '1701096934532x871141257443541000', rate_2: 248.64, rate_3: 174.05, rate_4: 136.75, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1701098422128x952084668440117200', rate_2: 563.5, rate_3: 376.6875, rate_4: 281.75, rate_5: 226.625, rate_7: 0.0 },
  { _id: '1701107772942x447054126943830000', rate_2: 263.74, rate_3: 241.76, rate_4: 219.78, rate_5: 153.85, rate_7: 153.85 },
  { _id: '1701108927937x193359077396447230', rate_2: 384.62, rate_3: 258.24, rate_4: 192.31, rate_5: 153.85, rate_7: 153.85 },
  { _id: '1701110853813x146584157247504400', rate_2: 386.32, rate_3: 256.41, rate_4: 194.87, rate_5: 153.85, rate_7: 153.85 },
  { _id: '1701114425690x948912662195732500', rate_2: 341.88, rate_3: 228.80, rate_4: 170.94, rate_5: 136.75, rate_7: 136.75 },
  { _id: '1701145466747x574424644948328450', rate_2: 437.5, rate_3: 350.0, rate_4: 306.25, rate_5: 262.5, rate_7: 262.5 },
  { _id: '1701196985127x160157906679627780', rate_2: 700.0, rate_3: 525.0, rate_4: 393.75, rate_5: 315.0, rate_7: 315.0 },
  { _id: '1701200559378x425368324389994500', rate_2: 183.75, rate_3: 175.0, rate_4: 166.25, rate_5: 157.5, rate_7: 157.5 },
  { _id: '1701658222257x936218888647475200', rate_2: 336.875, rate_3: 306.25, rate_4: 275.625, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1706239540594x193964324320182270', rate_2: 700.0, rate_3: 700.0, rate_4: 700.0, rate_5: 700.0, rate_7: 0.0 },
  { _id: '1706276613268x802980765274996700', rate_2: 288.46, rate_3: 230.77, rate_4: 192.31, rate_5: 153.85, rate_7: 0.0 },
  { _id: '1706277245744x575623079037239300', rate_2: 266.67, rate_3: 225.64, rate_4: 184.62, rate_5: 153.85, rate_7: 0.0 },
  { _id: '1706278602049x325570475852038140', rate_2: 367.5, rate_3: 315.0, rate_4: 280.0, rate_5: 218.75, rate_7: 0.0 },
  { _id: '1706279868074x764232363612569600', rate_2: 568.75, rate_3: 481.25, rate_4: 367.5, rate_5: 315.0, rate_7: 0.0 },
  { _id: '1706291541725x157707017588310000', rate_2: 385.0, rate_3: 280.0, rate_4: 227.5, rate_5: 201.25, rate_7: 0.0 },
  { _id: '1706292877098x546459416878645250', rate_2: 455.0, rate_3: 367.5, rate_4: 323.75, rate_5: 280.0, rate_7: 0.0 },
  { _id: '1706811721752x425795079443316740', rate_2: 0.0, rate_3: 210.0, rate_4: 192.5, rate_5: 175.0, rate_7: 175.0 },
  { _id: '1706889001404x899940748149915600', rate_2: 218.75, rate_3: 192.5, rate_4: 175.0, rate_5: 157.5, rate_7: 0.0 },
  { _id: '1706895707514x267009703456276480', rate_2: 437.5, rate_3: 306.25, rate_4: 218.75, rate_5: 175.0, rate_7: 175.0 },
  { _id: '1706925338365x264553018017185800', rate_2: 306.25, rate_3: 306.25, rate_4: 275.625, rate_5: 260.3125, rate_7: 0.0 },
  { _id: '1707014067125x183126705506877440', rate_2: 218.75, rate_3: 192.5, rate_4: 175.0, rate_5: 157.5, rate_7: 0.0 },
  { _id: '1707164361500x324187185566973950', rate_2: 0.0, rate_3: 0.0, rate_4: 161.54, rate_5: 153.85, rate_7: 0.0 },
  { _id: '1707164905322x906456152834310100', rate_2: 431.03, rate_3: 265.25, rate_4: 195.62, rate_5: 153.85, rate_7: 153.85 },
  { _id: '1708550839728x616080053320024000', rate_2: 175.0, rate_3: 157.5, rate_4: 148.75, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1708975976521x897446438198050800', rate_2: 1050.0, rate_3: 1750.0, rate_4: 0.0, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1709769274331x170099903878397950', rate_2: 350.0, rate_3: 306.25, rate_4: 262.5, rate_5: 218.75, rate_7: 157.19 },
  { _id: '1709769752129x255773499741962240', rate_2: 437.5, rate_3: 393.75, rate_4: 350.0, rate_5: 306.25, rate_7: 8750.0 },
  { _id: '1710168539821x661551606616817700', rate_2: 525.0, rate_3: 787.5, rate_4: 1050.0, rate_5: 997.5, rate_7: 0.0 },
  { _id: '1710174146443x634972373504229400', rate_2: 136.75, rate_3: 136.75, rate_4: 0.0, rate_5: 0.0, rate_7: 157.19 },
  { _id: '1710466871799x760310303595692000', rate_2: 350.0, rate_3: 306.25, rate_4: 262.5, rate_5: 218.75, rate_7: 0.0 },
  { _id: '1710781477572x420551973264949250', rate_2: 437.5, rate_3: 437.5, rate_4: 437.5, rate_5: 437.5, rate_7: 0.0 },
  { _id: '1710812115761x162837508187750400', rate_2: 437.5, rate_3: 437.5, rate_4: 437.5, rate_5: 437.5, rate_7: 0.0 },
  { _id: '1711214389932x508016880830644200', rate_2: 218.75, rate_3: 218.75, rate_4: 218.75, rate_5: 218.75, rate_7: 3850.0 },
  { _id: '1711321614836x370638482062704600', rate_2: 262.5, rate_3: 218.75, rate_4: 192.5, rate_5: 175.0, rate_7: 175.0 },
  { _id: '1711322333333x689218851430465500', rate_2: 175.0, rate_3: 175.0, rate_4: 175.0, rate_5: 175.0, rate_7: 0.0 },
  { _id: '1711850039611x336009586557321200', rate_2: 0.0, rate_3: 175.0, rate_4: 175.0, rate_5: 175.0, rate_7: 125.0025 },
  { _id: '1712255217873x673056592240836600', rate_2: 875.0, rate_3: 787.5, rate_4: 612.5, rate_5: 437.5, rate_7: 749.9975 },
  { _id: '1712382481415x922649898063233000', rate_2: 437.5, rate_3: 393.75, rate_4: 350.0, rate_5: 306.25, rate_7: 0.0 },
  { _id: '1712764851465x452882328666243100', rate_2: 765.625, rate_3: 689.0625, rate_4: 612.5, rate_5: 535.9375, rate_7: 0.0 },
  { _id: '1715169167743x677149508794056700', rate_2: 437.5, rate_3: 0.0, rate_4: 0.0, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1715307990517x946450743775461400', rate_2: 361.60, rate_3: 236.69, rate_4: 174.23, rate_5: 136.75, rate_7: 97.69 },
  { _id: '1715710568384x856277206800793600', rate_2: 350.0, rate_3: 350.0, rate_4: 350.0, rate_5: 350.0, rate_7: 250.005 },
  { _id: '1715882715957x869442771604996100', rate_2: 612.5, rate_3: 583.3275, rate_4: 568.75, rate_5: 525.0, rate_7: 375.0075 },
  { _id: '1716837513930x810350804178829300', rate_2: 525.0, rate_3: 431.666666666667, rate_4: 350.0, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1716918643210x188089442111324160', rate_2: 0.0, rate_3: 320.833333333333, rate_4: 295.3125, rate_5: 280.0, rate_7: 0.0 },
  { _id: '1716919240431x929812617363456000', rate_2: 350.0, rate_3: 350.0, rate_4: 350.0, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1716926816194x915533992796880900', rate_2: 218.75, rate_3: 218.75, rate_4: 218.75, rate_5: 218.75, rate_7: 0.0 },
  { _id: '1716936084849x232413487235334140', rate_2: 262.5, rate_3: 245.0, rate_4: 218.75, rate_5: 210.0, rate_7: 149.9925 },
  { _id: '1716939624401x916350881148174300', rate_2: 192.5, rate_3: 160.4225, rate_4: 164.0625, rate_5: 166.25, rate_7: 118.755 },
  { _id: '1717025269468x950306488805752800', rate_2: 350.0, rate_3: 320.83333333333337, rate_4: 295.3125, rate_5: 280.0, rate_7: 0.0 },
  { _id: '1717163073797x678169596364324900', rate_2: 350.0, rate_3: 320.833333333333, rate_4: 295.3125, rate_5: 280.0, rate_7: 0.0 },
  { _id: '1717511811382x522148393660710900', rate_2: 218.75, rate_3: 175.0, rate_4: 140.0, rate_5: 122.5, rate_7: 157.19 },
  { _id: '1717513567805x406949711168667650', rate_2: 175.0, rate_3: 175.0, rate_4: 175.0, rate_5: 175.0, rate_7: 0.0 },
  { _id: '1717515108287x333408151758176260', rate_2: 350.0, rate_3: 320.83333333333337, rate_4: 295.3125, rate_5: 280.0, rate_7: 0.0 },
  { _id: '1717548263600x123167564645007360', rate_2: 350.0, rate_3: 262.5, rate_4: 251.5625, rate_5: 245.0, rate_7: 175.0 },
  { _id: '1717639827317x736311672073617400', rate_2: 262.24, rate_3: 209.79, rate_4: 174.83, rate_5: 153.85, rate_7: 0.0 },
  { _id: '1717982229061x614219702975070200', rate_2: 262.5, rate_3: 262.5, rate_4: 251.5625, rate_5: 245.0, rate_7: 175.0 },
  { _id: '1719006469107x553417520171712500', rate_2: 350.0, rate_3: 320.83333333333337, rate_4: 295.3125, rate_5: 280.0, rate_7: 0.0 },
  { _id: '1719494555108x376486987716886500', rate_2: 0.0, rate_3: 612.5, rate_4: 525.0, rate_5: 455.0, rate_7: 324.9925 },
  { _id: '1719941059601x287984956893822980', rate_2: 0.0, rate_3: 0.0, rate_4: 0.0, rate_5: 280.0, rate_7: 200.0075 },
  { _id: '1720107602506x230535081264152580', rate_2: 437.5, rate_3: 320.8275, rate_4: 262.5, rate_5: 227.5, rate_7: 162.505 },
  { _id: '1720450580570x456455181796114400', rate_2: 350.0, rate_3: 291.66666666666663, rate_4: 306.25, rate_5: 315.0, rate_7: 0.0 },
  { _id: '1720452864534x255924965059330050', rate_2: 525.0, rate_3: 379.17249999999996, rate_4: 341.25, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1720541956136x826699674079461400', rate_2: 357.0, rate_3: 291.67249999999996, rate_4: 331.625, rate_5: 280.0, rate_7: 200.00750000000002 },
  { _id: '1721159072431x430079303492829200', rate_2: 320.51, rate_3: 213.67, rate_4: 160.26, rate_5: 153.85, rate_7: 109.90 },
  { _id: '1721764358479x431966472854569000', rate_2: 393.75, rate_3: 379.1725, rate_4: 328.125, rate_5: 297.5, rate_7: 212.5025 },
  { _id: '1722292951040x957160309297250300', rate_2: 350.0, rate_3: 320.8275, rate_4: 295.3125, rate_5: 280.0, rate_7: 200.0075 },
  { _id: '1727459051480x660125284704190500', rate_2: 175.0, rate_3: 175.0, rate_4: 175.0, rate_5: 175.0, rate_7: 0.0 },
  { _id: '1727461915654x794304446154145800', rate_2: 525.0, rate_3: 481.25, rate_4: 437.5, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1734690563138x570755230312431600', rate_2: 315.0, rate_3: 315.0, rate_4: 297.5, rate_5: 332.5, rate_7: 0.0 },
  { _id: '1740156355184x751122133051506700', rate_2: 350.0, rate_3: 320.8275, rate_4: 295.3125, rate_5: 280.0, rate_7: 200.0075 },
  { _id: '1743202219512x180665359354036220', rate_2: 525.0, rate_3: 525.0, rate_4: 525.0, rate_5: 490.0, rate_7: 350.0 },
  { _id: '1743209649200x322418693220073500', rate_2: 700.0, rate_3: 641.6666666666667, rate_4: 612.5, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1743790812920x538927313033625600', rate_2: 350.0, rate_3: 175.0, rate_4: 175.0, rate_5: 175.0, rate_7: 125.0025 },
  { _id: '1745010336918x147135654043844600', rate_2: 437.5, rate_3: 408.33333333333337, rate_4: 315.0, rate_5: 315.0, rate_7: 225.00000000000003 },
  { _id: '1745632409176x969555839823380500', rate_2: 200.0, rate_3: 183.33333333333334, rate_4: 168.75, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1746850291419x611578852924457000', rate_2: 250.0, rate_3: 208.33, rate_4: 200.0, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1746864357033x955726479818227700', rate_2: 683.76, rate_3: 364.67, rate_4: 170.94, rate_5: 136.75, rate_7: 136.75 },
  { _id: '1747165582788x820190718826643500', rate_2: 150.0, rate_3: 150.0, rate_4: 150.0, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1748633590678x597424615657046000', rate_2: 200.0, rate_3: 200.0, rate_4: 200.0, rate_5: 200.0, rate_7: 142.85714285714286 },
  { _id: '1750511535679x722349287474987000', rate_2: 150.0, rate_3: 150.0, rate_4: 0.0, rate_5: 0.0, rate_7: 0.0 },
  { _id: '1751053651112x109397186471788540', rate_2: 200.0, rate_3: 200.0, rate_4: 200.0, rate_5: 180.0, rate_7: 180.0 },
  { _id: '1751499985462x742652426778837000', rate_2: 153.85, rate_3: 153.85, rate_4: 153.85, rate_5: 153.85, rate_7: 109.89 },
  { _id: '1751994688546x488170037532950500', rate_2: 225.0, rate_3: 225.0, rate_4: 225.0, rate_5: 220.0, rate_7: 220.0 },
  { _id: '1754915251116x108815317212594180', rate_2: 200.0, rate_3: 200.0, rate_4: 200.0, rate_5: 160.0, rate_7: 160.0 },
  { _id: '1755636481218x166677976098275330', rate_2: 300.0, rate_3: 300.0, rate_4: 300.0, rate_5: 300.0, rate_7: 214.29 },
  { _id: '1755704771875x695778564569038800', rate_2: 136.75, rate_3: 136.75, rate_4: null, rate_5: null, rate_7: 157.19 },
  { _id: '1755752658354x940655278071480300', rate_2: 238.0, rate_3: 227.0, rate_4: 216.0, rate_5: 206.0, rate_7: 206.0 },
  { _id: '1757672980640x960268562502516700', rate_2: 571.0, rate_3: 544.0, rate_4: 518.0, rate_5: 493.0, rate_7: 493.0 },
  { _id: '1758050224335x488068069143609340', rate_2: 190.77, rate_3: 177.44, rate_4: 165.13, rate_5: 153.85, rate_7: 153.85 },
  { _id: '1765300389292x887488743501183100', rate_2: 100, rate_3: 100, rate_4: 100, rate_5: 100, rate_7: 100 },
  { _id: '1765300389665x966430432743890200', rate_2: 98, rate_3: 96, rate_4: 95, rate_5: 94, rate_7: 94 },
  { _id: '1765300389993x105805911100254100', rate_2: 99, rate_3: 98, rate_4: 97, rate_5: 96, rate_7: 96 },
  { _id: '1765300390427x345667280113171500', rate_2: 154, rate_3: 148, rate_4: 143, rate_5: 138, rate_7: 128 },
  { _id: '1765300390966x168990445019859620', rate_2: 95, rate_3: 90, rate_4: 86, rate_5: 82, rate_7: 74 },
  { _id: '1765300391442x174136096212115900', rate_2: 95, rate_3: 90, rate_4: 86, rate_5: 82, rate_7: 74 },
  { _id: '1765300392349x469793138907186300', rate_2: 95, rate_3: 90, rate_4: 86, rate_5: 82, rate_7: 74 },
  { _id: '1765727442714x56574371735111704', rate_2: 174, rate_3: 164, rate_4: 155, rate_5: 146, rate_7: 130 },
  { _id: '1765737678816x35129162170430652', rate_2: 132, rate_3: 116, rate_4: 102, rate_5: 90, rate_7: 70 },
  { _id: '1765741563238x97726176939706896', rate_2: 164, rate_3: 160, rate_4: 156, rate_5: 152, rate_7: 144 },
  { _id: '1765900064945x25199016212134872', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 54 },
  { _id: '1765900072090x07546646176005667', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 54 },
  { _id: '1765900229635x85958458208484464', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 54 },
  { _id: '1765900326296x90736735657506400', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 54 },
  { _id: '1765900332499x02515506445093995', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 76 },
  { _id: '1765900461334x64421368228290568', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 54 },
  { _id: '1765900851682x20228559937504364', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 54 },
  { _id: '1765900921250x84841819125329760', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 54 },
  { _id: '1765900974342x98107756631705152', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 76 },
  { _id: '1765901048170x64855832289573808', rate_2: 170, rate_3: 160, rate_4: 151, rate_5: 142, rate_7: 126 },
  { _id: '1765901290186x85422372884398464', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 54 },
  { _id: '1765901377419x14972429737771864', rate_2: 127, rate_3: 107, rate_4: 90, rate_5: 76, rate_7: 76 },
  { _id: '1765902303577x79538089549516128', rate_2: 163, rate_3: 148, rate_4: 134, rate_5: 122, rate_7: 122 },
  { _id: '1765903819382x37591297676601672', rate_2: 95, rate_3: 90, rate_4: 86, rate_5: 82, rate_7: 74 },
  { _id: '1765907800316x18862107892191048', rate_2: 175, rate_3: 170, rate_4: 166, rate_5: 162, rate_7: 154 },
  { _id: '1765907900140x03032140472078071', rate_2: 146, rate_3: 142, rate_4: 138, rate_5: 135, rate_7: 129 },
  { _id: '1765920274587x02177028478341913', rate_2: 95, rate_3: 90, rate_4: 86, rate_5: 82, rate_7: 74 },
  { _id: '1765925936909x18410460644212880', rate_2: 147, rate_3: 131, rate_4: 117, rate_5: 104, rate_7: 83 },
  { _id: '1765927145616x55294201928847216', rate_2: 177, rate_3: 174, rate_4: 171, rate_5: 168, rate_7: 120 },
  { _id: '1765928847076x97558852867184528', rate_2: 187, rate_3: 175, rate_4: 163, rate_5: 160, rate_7: 114 },
  { _id: '1766050900564x79175641157269664', rate_2: 98, rate_3: 96, rate_4: 94, rate_5: 92, rate_7: 88 },
  { _id: '1766171410983x31943634810508416', rate_2: 98, rate_3: 96, rate_4: 94, rate_5: 92, rate_7: 88 },
  { _id: '1766176789932x90106872535661792', rate_2: 228, rate_3: 208, rate_4: 189, rate_5: 172, rate_7: 143 },
];

/**
 * Calculate the 1-night rate from existing rates
 * Uses the decay algorithm: price[n] = ceil(price[n-1] × decay)
 * Reverse: p1 = p2 / decay, where decay = consecutive_rate_ratio
 */
function calculate1NightRate(listing) {
  const { rate_2, rate_3, rate_4, rate_5, rate_7 } = listing;

  // Get valid (non-zero, non-null) rates
  const validRates = [];
  if (rate_2 && rate_2 > 0) validRates.push({ night: 2, rate: rate_2 });
  if (rate_3 && rate_3 > 0) validRates.push({ night: 3, rate: rate_3 });
  if (rate_4 && rate_4 > 0) validRates.push({ night: 4, rate: rate_4 });
  if (rate_5 && rate_5 > 0) validRates.push({ night: 5, rate: rate_5 });
  if (rate_7 && rate_7 > 0) validRates.push({ night: 7, rate: rate_7 });

  if (validRates.length === 0) {
    return { p1: null, method: 'no_valid_rates', confidence: 0 };
  }

  // Sort by night number
  validRates.sort((a, b) => a.night - b.night);

  // Check for flat rate (all rates equal)
  const allEqual = validRates.every(r => Math.abs(r.rate - validRates[0].rate) < 1);
  if (allEqual) {
    return {
      p1: Math.ceil(validRates[0].rate),
      method: 'flat_rate',
      confidence: 1,
      decay: 1.0
    };
  }

  // Check for anomalous data (rates increasing instead of decreasing)
  const isAnomalous = validRates.some((r, i) => {
    if (i === 0) return false;
    // Ignore rate_7 in anomaly check as it sometimes has different patterns
    if (r.night === 7) return false;
    return r.rate > validRates[i-1].rate * 1.1; // Allow 10% variance
  });

  if (isAnomalous) {
    // For anomalous data, use the highest rate as base
    const maxRate = Math.max(...validRates.filter(r => r.night <= 5).map(r => r.rate));
    return {
      p1: Math.ceil(maxRate * 1.1), // Add 10% premium for 1-night
      method: 'anomalous_max',
      confidence: 0.5
    };
  }

  // Try to calculate decay from consecutive rates (excluding rate_7)
  const consecutiveRates = validRates.filter(r => r.night <= 5);
  let estimatedDecay = null;
  let decayCount = 0;
  let decaySum = 0;

  for (let i = 1; i < consecutiveRates.length; i++) {
    const prev = consecutiveRates[i-1];
    const curr = consecutiveRates[i];

    // Only use truly consecutive nights
    if (curr.night === prev.night + 1) {
      const decay = curr.rate / prev.rate;
      if (decay > 0.7 && decay <= 1.0) { // Valid decay range
        decaySum += decay;
        decayCount++;
      }
    }
  }

  if (decayCount > 0) {
    estimatedDecay = decaySum / decayCount;
  }

  // If we have rate_2 and a valid decay, calculate p1 directly
  if (rate_2 && rate_2 > 0 && estimatedDecay) {
    const p1 = rate_2 / estimatedDecay;
    return {
      p1: Math.ceil(p1),
      method: 'decay_from_rate_2',
      confidence: 0.9,
      decay: estimatedDecay
    };
  }

  // If we have rate_2 but no good decay estimate, estimate decay from p2/p5 ratio
  if (rate_2 && rate_2 > 0 && rate_5 && rate_5 > 0) {
    // p5 = p2 * decay^3, so decay = (p5/p2)^(1/3)
    const decay = Math.pow(rate_5 / rate_2, 1/3);
    if (decay > 0.7 && decay <= 1.0) {
      const p1 = rate_2 / decay;
      return {
        p1: Math.ceil(p1),
        method: 'decay_from_p2_p5_ratio',
        confidence: 0.8,
        decay: decay
      };
    }
  }

  // If we only have rate_2, estimate a reasonable decay (0.93 is typical ~20% discount at night 5)
  if (rate_2 && rate_2 > 0) {
    const defaultDecay = 0.93;
    const p1 = rate_2 / defaultDecay;
    return {
      p1: Math.ceil(p1),
      method: 'default_decay_from_rate_2',
      confidence: 0.7,
      decay: defaultDecay
    };
  }

  // If no rate_2, work backwards from the earliest available rate
  const earliestRate = consecutiveRates[0] || validRates[0];

  // Estimate p1 by working back using average decay or default
  const decay = estimatedDecay || 0.93;
  const stepsBack = earliestRate.night - 1;
  const p1 = earliestRate.rate / Math.pow(decay, stepsBack);

  return {
    p1: Math.ceil(p1),
    method: 'extrapolate_from_earliest',
    confidence: 0.6,
    decay: decay,
    earliestNight: earliestRate.night
  };
}

// Calculate all 1-night rates
const results = listings.map(listing => {
  const result = calculate1NightRate(listing);
  return {
    _id: listing._id,
    ...result,
    original: {
      rate_2: listing.rate_2,
      rate_3: listing.rate_3,
      rate_4: listing.rate_4,
      rate_5: listing.rate_5,
      rate_7: listing.rate_7
    }
  };
});

// Output summary
console.log('=== 1-Night Rate Calculation Results ===\n');

// Group by method
const byMethod = {};
results.forEach(r => {
  if (!byMethod[r.method]) byMethod[r.method] = [];
  byMethod[r.method].push(r);
});

console.log('Method Distribution:');
Object.entries(byMethod).forEach(([method, items]) => {
  console.log(`  ${method}: ${items.length} listings`);
});

console.log('\n=== Sample Results ===\n');
results.slice(0, 10).forEach(r => {
  console.log(`ID: ${r._id}`);
  console.log(`  Calculated p1: $${r.p1}`);
  console.log(`  Method: ${r.method} (confidence: ${r.confidence})`);
  console.log(`  Original rates: n2=$${r.original.rate_2}, n3=$${r.original.rate_3}, n4=$${r.original.rate_4}, n5=$${r.original.rate_5}`);
  console.log('');
});

// Generate SQL update statements
console.log('\n=== SQL UPDATE Statements ===\n');

const validResults = results.filter(r => r.p1 !== null && r.p1 > 0);
console.log(`Total valid updates: ${validResults.length}\n`);

// Output as array for bulk update
console.log('const updates = [');
validResults.forEach(r => {
  console.log(`  { _id: '${r._id}', rate_1_night: ${r.p1} },`);
});
console.log('];');

// Export for use
module.exports = { results, calculate1NightRate };
