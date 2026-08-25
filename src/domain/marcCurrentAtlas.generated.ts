// Généré par scripts/extract-marc-harmonics.mjs — ne pas éditer à la main.
// Source : atlas de composantes harmoniques de courant de marée Ifremer/MARC (V1_MANW).
// Citation requise : Pineau-Guillou Lucia (2013). PREVIMER Validation des atlas de
// composantes harmoniques de hauteurs et courants de marée. Rapport Ifremer, 89p.
// http://archimer.ifremer.fr/doc/00157/26801/
import type { MarcHarmonicTable } from './marcCurrent'

export const MARC_CURRENT_ATLAS: Record<string, MarcHarmonicTable> = {
  "saint-cast-le-guildo": {
    "gridPoint": {
      "uLat": 48.630959682651884,
      "uLon": -2.24993549348702,
      "vLat": 48.6320897519289,
      "vLon": -2.2516043719317964,
      "distanceKm": 1.1602231002994652
    },
    "constituents": [
      {
        "name": "2N2",
        "speed": 27.8953548,
        "uAmplitude": 0.00207835995393868,
        "uPhase": -100.06597900390625,
        "vAmplitude": 0.0010392579048534856,
        "vPhase": 149.42039489746094
      },
      {
        "name": "2Q1",
        "speed": 12.8542862,
        "uAmplitude": 0.0001590341127089001,
        "uPhase": -98.07500457763672,
        "vAmplitude": 0.0002520970144487267,
        "vPhase": 45.82440185546875
      },
      {
        "name": "E2",
        "speed": 27.4238338,
        "uAmplitude": 0.002292032682369438,
        "uPhase": 19.067060470581055,
        "vAmplitude": 0.0004223279852733075,
        "vPhase": -113.28662872314453
      },
      {
        "name": "J1",
        "speed": 15.5854433,
        "uAmplitude": 0.00013078429970753147,
        "uPhase": -63.10784149169922,
        "vAmplitude": 0.000190005080474287,
        "vPhase": 166.61715698242188
      },
      {
        "name": "K1",
        "speed": 15.0410686,
        "uAmplitude": 0.0008570695696152875,
        "uPhase": -175.5672607421875,
        "vAmplitude": 0.00020392566730254025,
        "vPhase": 53.440059661865234
      },
      {
        "name": "K2",
        "speed": 30.0821373,
        "uAmplitude": 0.006357788993671676,
        "uPhase": -36.21957015991211,
        "vAmplitude": 0.0019465167427101804,
        "vPhase": -174.06723022460938
      },
      {
        "name": "KJ2",
        "speed": 30.626512,
        "uAmplitude": 0.0004127586448332554,
        "uPhase": 116.10520935058594,
        "vAmplitude": 0.00005317471204108193,
        "vPhase": 149.86924743652344
      },
      {
        "name": "KQ1",
        "speed": 16.6834764,
        "uAmplitude": 0.00006441948834742806,
        "uPhase": -45.84109878540039,
        "vAmplitude": 0.000030481328624279436,
        "vPhase": -30.38947105407715
      },
      {
        "name": "Ki1",
        "speed": 14.5695476,
        "uAmplitude": 0.00004518944138887093,
        "uPhase": 175.5729217529297,
        "vAmplitude": 0.00012506570454262622,
        "vPhase": -10.598586082458496
      },
      {
        "name": "L2",
        "speed": 29.5284789,
        "uAmplitude": 0.0036320415778146042,
        "uPhase": -91.01329040527344,
        "vAmplitude": 0.0017035961004285838,
        "vPhase": -171.7787322998047
      },
      {
        "name": "La2",
        "speed": 29.4556253,
        "uAmplitude": 0.0036938279850051714,
        "uPhase": -75.09630584716797,
        "vAmplitude": 0.001025606845910243,
        "vPhase": -165.75421142578125
      },
      {
        "name": "M1",
        "speed": 14.4966939,
        "uAmplitude": 0.00012162066995002885,
        "uPhase": -26.164295196533203,
        "vAmplitude": 0.00014380807920238992,
        "vPhase": -158.11045837402344
      },
      {
        "name": "M2",
        "speed": 28.9841042,
        "uAmplitude": 0.0672805212259675,
        "uPhase": -80.27745819091797,
        "vAmplitude": 0.018357608023791272,
        "vPhase": 162.35572814941406
      },
      {
        "name": "M4",
        "speed": 57.9682085,
        "uAmplitude": 0.009172233912710936,
        "uPhase": -57.510711669921875,
        "vAmplitude": 0.009834568248408004,
        "vPhase": -130.55882263183594
      },
      {
        "name": "M6",
        "speed": 86.9523127,
        "uAmplitude": 0.014473804517791677,
        "uPhase": 125.30049133300781,
        "vAmplitude": 0.007988451870719615,
        "vPhase": 30.311504364013672
      },
      {
        "name": "MK4",
        "speed": 59.0662415,
        "uAmplitude": 0.0020618935228000623,
        "uPhase": 64.20293426513672,
        "vAmplitude": 0.002545574364098968,
        "vPhase": -83.38746643066406
      },
      {
        "name": "MN4",
        "speed": 57.4238338,
        "uAmplitude": 0.00271065778343349,
        "uPhase": -43.821800231933594,
        "vAmplitude": 0.0039395573781586535,
        "vPhase": -143.30506896972656
      },
      {
        "name": "MP1",
        "speed": 14.0251729,
        "uAmplitude": 0.00022194350727755552,
        "uPhase": 5.260639667510986,
        "vAmplitude": 0.0002502792428654699,
        "vPhase": -108.15177917480469
      },
      {
        "name": "MS4",
        "speed": 58.9841042,
        "uAmplitude": 0.004925577222731903,
        "uPhase": 70.43099975585938,
        "vAmplitude": 0.00799543642109768,
        "vPhase": -83.06794738769531
      },
      {
        "name": "Mf",
        "speed": 1.098033,
        "uAmplitude": 0.0006472003913393642,
        "uPhase": -132.075927734375,
        "vAmplitude": 0.0011407072766966841,
        "vPhase": 53.052101135253906
      },
      {
        "name": "Mm",
        "speed": 0.5443747,
        "uAmplitude": 0.00024046944287814398,
        "uPhase": 75.866943359375,
        "vAmplitude": 0.0005308271748261095,
        "vPhase": -101.55064392089844
      },
      {
        "name": "Mu2",
        "speed": 27.9682085,
        "uAmplitude": 0.004311888804808817,
        "uPhase": 25.427942276000977,
        "vAmplitude": 0.0026873152169937242,
        "vPhase": -22.213123321533203
      },
      {
        "name": "N2",
        "speed": 28.4397295,
        "uAmplitude": 0.011139339769954404,
        "uPhase": -99.78826141357422,
        "vAmplitude": 0.0024537574171734633,
        "vPhase": 124.99885559082031
      },
      {
        "name": "Nu2",
        "speed": 28.5125832,
        "uAmplitude": 0.0022903808440633,
        "uPhase": -106.80570983886719,
        "vAmplitude": 0.0013919903594983296,
        "vPhase": 162.69342041015625
      },
      {
        "name": "O1",
        "speed": 13.9430356,
        "uAmplitude": 0.0006019837370385694,
        "uPhase": 85.62523651123047,
        "vAmplitude": 0.00021802322901054438,
        "vPhase": -19.937171936035156
      },
      {
        "name": "OO1",
        "speed": 16.1391017,
        "uAmplitude": 0.00003919717546416179,
        "uPhase": 53.24549102783203,
        "vAmplitude": 0.00003223132714162691,
        "vPhase": -143.862060546875
      },
      {
        "name": "P1",
        "speed": 14.9589314,
        "uAmplitude": 0.0003350949951519411,
        "uPhase": 152.5147705078125,
        "vAmplitude": 0.00034609963479148576,
        "vPhase": -72.51261901855469
      },
      {
        "name": "Phi1",
        "speed": 15.123206,
        "uAmplitude": 0.00014299289241431756,
        "uPhase": -96.85212707519531,
        "vAmplitude": 0.0002669052042431064,
        "vPhase": 71.868408203125
      },
      {
        "name": "Pi1",
        "speed": 14.9178647,
        "uAmplitude": 0.0001666466883437634,
        "uPhase": -153.4891357421875,
        "vAmplitude": 0.0000647213724938589,
        "vPhase": -70.00117492675781
      },
      {
        "name": "Psi1",
        "speed": 15.0821353,
        "uAmplitude": 0.00032306248599289766,
        "uPhase": 160.8944549560547,
        "vAmplitude": 0.00015277668915458786,
        "vPhase": -67.35447692871094
      },
      {
        "name": "Q1",
        "speed": 13.3986609,
        "uAmplitude": 0.00009452110271479519,
        "uPhase": -52.56789016723633,
        "vAmplitude": 0.0002173085262635599,
        "vPhase": 93.11832427978516
      },
      {
        "name": "R2",
        "speed": 30.0410667,
        "uAmplitude": 0.0005150113796725808,
        "uPhase": 42.02050018310547,
        "vAmplitude": 0.0002549341242308323,
        "vPhase": -125.52891540527344
      },
      {
        "name": "Ro1",
        "speed": 13.4715145,
        "uAmplitude": 0.000023570053922991607,
        "uPhase": 113.3208236694336,
        "vAmplitude": 0.00005798263420273009,
        "vPhase": 37.398197174072266
      },
      {
        "name": "S2",
        "speed": 30,
        "uAmplitude": 0.02193170006947298,
        "uPhase": -31.413921356201172,
        "vAmplitude": 0.005524236837093355,
        "vPhase": -167.15402221679688
      },
      {
        "name": "Sig1",
        "speed": 12.9271398,
        "uAmplitude": 0.00009649537582728795,
        "uPhase": 171.92588806152344,
        "vAmplitude": 0.00010185696523723475,
        "vPhase": 144.0966033935547
      },
      {
        "name": "T2",
        "speed": 29.9589333,
        "uAmplitude": 0.0013849703013635306,
        "uPhase": -27.744482040405273,
        "vAmplitude": 0.0005378416666834696,
        "vPhase": -164.1154327392578
      },
      {
        "name": "Tta1",
        "speed": 15.5125897,
        "uAmplitude": 0.0001344798622610055,
        "uPhase": -172.31539916992188,
        "vAmplitude": 0.00020408703477692303,
        "vPhase": 50.8572998046875
      },
      {
        "name": "Z0",
        "speed": 0,
        "uAmplitude": 0.01069018993103299,
        "uPhase": 180,
        "vAmplitude": 0.017176090328909766,
        "vPhase": 0
      }
    ]
  }
}
