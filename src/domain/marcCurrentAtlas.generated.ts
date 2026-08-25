// Généré par scripts/extract-marc-harmonics.mjs — ne pas éditer à la main.
// Source : atlas de composantes harmoniques de courant de marée Ifremer/MARC.
// Citation requise : Pineau-Guillou Lucia (2013). PREVIMER Validation des atlas de
// composantes harmoniques de hauteurs et courants de marée. Rapport Ifremer, 89p.
// http://archimer.ifremer.fr/doc/00157/26801/
import type { MarcHarmonicTable } from './marcCurrent'

export const MARC_CURRENT_ATLAS: Record<string, MarcHarmonicTable> = {
  "saint-cast-le-guildo": {
    "gridPoint": {
      "uLat": 48.63997198513609,
      "uLon": -2.246538133795867,
      "vLat": 48.638841915859075,
      "vLon": -2.2448692553510905,
      "distanceKm": 0.2213526778917869
    },
    "constituents": [
      {
        "name": "2N2",
        "speed": 27.8953548,
        "uAmplitude": 0.0024053302213600247,
        "uPhase": -169.13462829589844,
        "vAmplitude": 0.004895339748447469,
        "vPhase": -172.64175415039062
      },
      {
        "name": "2Q1",
        "speed": 12.8542862,
        "uAmplitude": 0.00025362839560061357,
        "uPhase": 58.2525520324707,
        "vAmplitude": 0.0005278174922529466,
        "vPhase": 62.33283996582031
      },
      {
        "name": "E2",
        "speed": 27.4238338,
        "uAmplitude": 0.0014943190576532928,
        "uPhase": -32.12083053588867,
        "vAmplitude": 0.003427334703482998,
        "vPhase": -45.17906951904297
      },
      {
        "name": "J1",
        "speed": 15.5854433,
        "uAmplitude": 0.00008658462794242094,
        "uPhase": 176.1072998046875,
        "vAmplitude": 0.00039162683644011764,
        "vPhase": -133.42962646484375
      },
      {
        "name": "K1",
        "speed": 15.0410686,
        "uAmplitude": 0.001007678266469192,
        "uPhase": 137.35948181152344,
        "vAmplitude": 0.0007601105465249169,
        "vPhase": 157.6894989013672
      },
      {
        "name": "K2",
        "speed": 30.0821373,
        "uAmplitude": 0.006630268533722727,
        "uPhase": -101.93253326416016,
        "vAmplitude": 0.009893308555746216,
        "vPhase": -126.35306549072266
      },
      {
        "name": "KJ2",
        "speed": 30.626512,
        "uAmplitude": 0.0001586993902541467,
        "uPhase": 91.10974884033203,
        "vAmplitude": 0.00034617949086324096,
        "vPhase": 109.47142028808594
      },
      {
        "name": "KQ1",
        "speed": 16.6834764,
        "uAmplitude": 0.00007385106796847785,
        "uPhase": 7.43085241317749,
        "vAmplitude": 0.00006013229507828566,
        "vPhase": 171.64337158203125
      },
      {
        "name": "Ki1",
        "speed": 14.5695476,
        "uAmplitude": 0.00015444106068018826,
        "uPhase": -10.210000991821289,
        "vAmplitude": 0.000361086491177387,
        "vPhase": -48.73723602294922
      },
      {
        "name": "L2",
        "speed": 29.5284789,
        "uAmplitude": 0.004042807822752792,
        "uPhase": -152.2559051513672,
        "vAmplitude": 0.006688417433178273,
        "vPhase": -152.3057861328125
      },
      {
        "name": "La2",
        "speed": 29.4556253,
        "uAmplitude": 0.003446075813906546,
        "uPhase": -130.65054321289062,
        "vAmplitude": 0.0062214776260383076,
        "vPhase": -141.11233520507812
      },
      {
        "name": "M1",
        "speed": 14.4966939,
        "uAmplitude": 0.00005384617154283178,
        "uPhase": 105.4366683959961,
        "vAmplitude": 0.0001844123905031525,
        "vPhase": -158.8976593017578
      },
      {
        "name": "M2",
        "speed": 28.9841042,
        "uAmplitude": 0.0659390544751659,
        "uPhase": -139.1799774169922,
        "vAmplitude": 0.09976109384723486,
        "vPhase": -158.4561309814453
      },
      {
        "name": "M4",
        "speed": 57.9682085,
        "uAmplitude": 0.03451949087917683,
        "uPhase": -79.5045394897461,
        "vAmplitude": 0.046421183350418005,
        "vPhase": -101.89287567138672
      },
      {
        "name": "M6",
        "speed": 86.9523127,
        "uAmplitude": 0.009097852729578193,
        "uPhase": 27.534143447875977,
        "vAmplitude": 0.008090831793179376,
        "vPhase": -28.396177291870117
      },
      {
        "name": "MK4",
        "speed": 59.0662415,
        "uAmplitude": 0.007792424605579384,
        "uPhase": -29.074920654296875,
        "vAmplitude": 0.010299757115674879,
        "vPhase": -50.62367630004883
      },
      {
        "name": "MN4",
        "speed": 57.4238338,
        "uAmplitude": 0.011741929685520347,
        "uPhase": -99.26300811767578,
        "vAmplitude": 0.016035836139920434,
        "vPhase": -122.89512634277344
      },
      {
        "name": "MP1",
        "speed": 14.0251729,
        "uAmplitude": 0.00025033903487181597,
        "uPhase": -91.26665496826172,
        "vAmplitude": 0.0002095927016393384,
        "vPhase": -141.9501495361328
      },
      {
        "name": "MS4",
        "speed": 58.9841042,
        "uAmplitude": 0.02268564499964043,
        "uPhase": -32.437198638916016,
        "vAmplitude": 0.02891365430663484,
        "vPhase": -55.90567398071289
      },
      {
        "name": "Mf",
        "speed": 1.098033,
        "uAmplitude": 0.003152465374984814,
        "uPhase": 48.0168571472168,
        "vAmplitude": 0.007933351399493915,
        "vPhase": 47.95764923095703
      },
      {
        "name": "Mm",
        "speed": 0.5443747,
        "uAmplitude": 0.004086413676400724,
        "uPhase": 18.920791625976562,
        "vAmplitude": 0.013087646889431426,
        "vPhase": 22.990835189819336
      },
      {
        "name": "Mu2",
        "speed": 27.9682085,
        "uAmplitude": 0.004011680908266868,
        "uPhase": -37.259700775146484,
        "vAmplitude": 0.008962669460839123,
        "vPhase": -2.0065643787384033
      },
      {
        "name": "N2",
        "speed": 28.4397295,
        "uAmplitude": 0.010391638384028568,
        "uPhase": -157.37417602539062,
        "vAmplitude": 0.014501887078708364,
        "vPhase": 173.10157775878906
      },
      {
        "name": "Nu2",
        "speed": 28.5125832,
        "uAmplitude": 0.002764562050723285,
        "uPhase": 172.94725036621094,
        "vAmplitude": 0.0033619486246916352,
        "vPhase": -172.23971557617188
      },
      {
        "name": "O1",
        "speed": 13.9430356,
        "uAmplitude": 0.0008972234581094973,
        "uPhase": 25.190805435180664,
        "vAmplitude": 0.0009957833862483945,
        "vPhase": 51.63707733154297
      },
      {
        "name": "OO1",
        "speed": 16.1391017,
        "uAmplitude": 0.0001408950242950957,
        "uPhase": -106.23405456542969,
        "vAmplitude": 0.00012107947680223274,
        "vPhase": -146.35128784179688
      },
      {
        "name": "P1",
        "speed": 14.9589314,
        "uAmplitude": 0.00016671819499936014,
        "uPhase": 162.8400115966797,
        "vAmplitude": 0.00015804040485289939,
        "vPhase": 179.87603759765625
      },
      {
        "name": "Phi1",
        "speed": 15.123206,
        "uAmplitude": 0.00023011682169782333,
        "uPhase": 73.48345184326172,
        "vAmplitude": 0.00026523717643722744,
        "vPhase": 81.01483154296875
      },
      {
        "name": "Pi1",
        "speed": 14.9178647,
        "uAmplitude": 0.0001364481507157289,
        "uPhase": -22.275379180908203,
        "vAmplitude": 0.00012100062120518063,
        "vPhase": 133.64085388183594
      },
      {
        "name": "Psi1",
        "speed": 15.0821353,
        "uAmplitude": 0.00011778344927382278,
        "uPhase": -0.8666746020317078,
        "vAmplitude": 0.00021616954948067146,
        "vPhase": -132.48768615722656
      },
      {
        "name": "Q1",
        "speed": 13.3986609,
        "uAmplitude": 0.00023072185422690072,
        "uPhase": -4.402523040771484,
        "vAmplitude": 0.00032755312579291207,
        "vPhase": 85.14349365234375
      },
      {
        "name": "R2",
        "speed": 30.0410667,
        "uAmplitude": 0.0003016148914025685,
        "uPhase": -29.277080535888672,
        "vAmplitude": 0.0007837691902090604,
        "vPhase": -29.67179298400879
      },
      {
        "name": "Ro1",
        "speed": 13.4715145,
        "uAmplitude": 0.00018442901657367283,
        "uPhase": -86.02204895019531,
        "vAmplitude": 0.00016595328661273,
        "vPhase": 176.18307495117188
      },
      {
        "name": "S2",
        "speed": 30,
        "uAmplitude": 0.023663875548365354,
        "uPhase": -90.76652526855469,
        "vAmplitude": 0.03366038477963684,
        "vPhase": -119.93839263916016
      },
      {
        "name": "Sig1",
        "speed": 12.9271398,
        "uAmplitude": 0.0002728145717434405,
        "uPhase": -150.51156616210938,
        "vAmplitude": 0.000059158983263390974,
        "vPhase": 123.01214599609375
      },
      {
        "name": "T2",
        "speed": 29.9589333,
        "uAmplitude": 0.001512057801567046,
        "uPhase": -108.95818328857422,
        "vAmplitude": 0.0012942578785102299,
        "vPhase": -149.3460235595703
      },
      {
        "name": "Tta1",
        "speed": 15.5125897,
        "uAmplitude": 0.0002559094051618471,
        "uPhase": 31.87920379638672,
        "vAmplitude": 0.00017425638988766146,
        "vPhase": 19.252992630004883
      },
      {
        "name": "Z0",
        "speed": 0,
        "uAmplitude": 0.04307066211140409,
        "uPhase": 0,
        "vAmplitude": 0.09022320280195117,
        "vPhase": 0
      }
    ]
  }
}
