"""
Reminder notification text in each language the app supports.

With a banner image Android shows the body on ONE line only, so bodies stay
short (about 40 characters) to fit without "...".
"""

COPY = {
  'en': {
    'slots': {
      'morning': [
        ('Good morning, money manager', 'Plan today before today plans you.'),
        ('Needs first, wants later', 'A 10-second plan saves a lot tonight.'),
        ('Your wallet woke up too', 'Tell it what today looks like.'),
        ('Fresh day, fresh page', 'Decide what today deserves.'),
      ],
      'afternoon': [
        ('Lunch was good. Was it logged?', 'Add it now. Future you says thanks.'),
        ('That chai counts too', 'Small spends add up. Note them.'),
        ('Halfway through the day', 'Spent anything? Takes five seconds.'),
        ('Quick check-in', 'Log it while the amount is fresh.'),
      ],
      'evening': [
        ('Evening check-in', 'Anything sneak out of the wallet?'),
        ('The day is wrapping up', 'Your ledger is too. Add today.'),
        ('Psst, your wallet has stories', 'Tell your ledger before it forgets.'),
        ('Golden hour for your ledger', 'Two minutes now, clarity forever.'),
      ],
      'night': [
        ("Don't let today's spends sleep", 'Note them before they become a mystery.'),
        ('One last thing tonight', 'Close the day. Sleep better.'),
        ("Psst, it's almost tomorrow", "Today's spends are still waiting."),
        ('Before you scroll to sleep', 'Ten seconds to log today. We timed it.'),
      ],
    },
    'empty_day': {
      'afternoon': ('Nothing logged yet today', 'You spent nothing, or you forgot?'),
      'evening': ('We saw nothing today', 'Saint or forgot? Log it in seconds.'),
      'night': ('Your ledger is still empty', 'Today happened. Write it down.'),
    },
    'spent_today': {1: '1 entry today, {money} spent', 'other': '{count} entries today, {money} spent'},
    'logged_today': {1: '1 entry logged today', 'other': '{count} entries logged today'},
    'missed_evening': 'Missed anything? Add it now.',
    'missed_night': 'Anything else before bed?',
    'streak_title': 'Your {streak}-day streak is on the line',
    'streak_body': 'One entry keeps it alive. No pressure.',
    'action_add': 'Add expense',
    'action_snooze': 'Remind in 10 min',
  },
  'te': {
    'slots': {
      'morning': [
        ('శుభోదయం, డబ్బు మేనేజర్ గారూ', 'ఈరోజు ఖర్చులను ముందే ప్లాన్ చేయండి.'),
        ('ముందు అవసరాలు, తర్వాత కోరికలు', '10 సెకన్ల ప్లాన్, రాత్రికి ప్రశాంతత.'),
        ('మీ పర్సు కూడా నిద్ర లేచింది', 'ఈరోజు ఎలా ఉండబోతుందో చెప్పండి.'),
        ('కొత్త రోజు, కొత్త పేజీ', 'ఈరోజు దేనికి ఖర్చు చేయాలో నిర్ణయించండి.'),
      ],
      'afternoon': [
        ('భోజనం బాగుందా? నమోదు చేశారా?', 'ఇప్పుడే జోడించండి, తర్వాత సులువు.'),
        ('ఆ టీ ఖర్చు కూడా లెక్కే', 'చిన్న ఖర్చులే పెద్దవవుతాయి.'),
        ('రోజులో సగం గడిచింది', 'ఏమైనా ఖర్చు చేశారా? ఐదు సెకన్లే.'),
        ('చిన్న చెక్-ఇన్', 'మొత్తం గుర్తుండగానే నమోదు చేయండి.'),
      ],
      'evening': [
        ('సాయంత్రం చెక్-ఇన్', 'పర్సులోంచి ఏమైనా జారిపోయిందా?'),
        ('రోజు ముగుస్తోంది', 'ఈరోజు లెక్కను ఇప్పుడే జోడించండి.'),
        ('మీ పర్సుకు చాలా కథలున్నాయి', 'మర్చిపోయే ముందే రాసుకోండి.'),
        ('లెక్క రాసుకునే సమయం ఇదే', 'ఇప్పుడు రెండు నిమిషాలు, తర్వాత స్పష్టత.'),
      ],
      'night': [
        ('ఈరోజు ఖర్చులను నిద్రపోనివ్వకండి', 'మర్చిపోయే ముందే రాసుకోండి.'),
        ('ఈ రాత్రికి చివరి పని', 'రోజును ముగించండి. హాయిగా నిద్రపోండి.'),
        ('దాదాపు రేపు వచ్చేసింది', 'ఈరోజు ఖర్చులు ఇంకా ఎదురుచూస్తున్నాయి.'),
        ('నిద్రపోయే ముందు ఒక్క నిమిషం', 'ఈరోజు లెక్కకు పది సెకన్లు చాలు.'),
      ],
    },
    'empty_day': {
      'afternoon': ('ఈరోజు ఇంకా ఏమీ నమోదు కాలేదు', 'ఖర్చు చేయలేదా, లేక మర్చిపోయారా?'),
      'evening': ('ఈరోజు ఒక్క ఎంట్రీ కూడా లేదు', 'మర్చిపోయారా? సెకన్లలో జోడించండి.'),
      'night': ('మీ ఖాతా పుస్తకం ఇంకా ఖాళీగా ఉంది', 'ఈరోజు జరిగినది రాసుకోండి.'),
    },
    'spent_today': {1: 'ఈరోజు 1 ఎంట్రీ, {money} ఖర్చైంది', 'other': 'ఈరోజు {count} ఎంట్రీలు, {money} ఖర్చైంది'},
    'logged_today': {1: 'ఈరోజు 1 ఎంట్రీ నమోదైంది', 'other': 'ఈరోజు {count} ఎంట్రీలు నమోదయ్యాయి'},
    'missed_evening': 'ఏమైనా మిగిలిపోయిందా? ఇప్పుడే జోడించండి.',
    'missed_night': 'నిద్రపోయే ముందు ఇంకేమైనా ఉందా?',
    'streak_title': 'మీ {streak} రోజుల వరుస ఆగిపోబోతోంది',
    'streak_body': 'ఒక్క ఎంట్రీతో అది కొనసాగుతుంది.',
    'action_add': 'ఖర్చు జోడించండి',
    'action_snooze': '10 నిమిషాల్లో గుర్తుచేయండి',
  },
  'ta': {
    'slots': {
      'morning': [
        ('காலை வணக்கம், பண மேலாளரே', 'இன்றைய செலவுகளை முன்பே திட்டமிடுங்கள்.'),
        ('முதலில் தேவை, பிறகு ஆசை', '10 விநாடி திட்டம், இரவில் நிம்மதி.'),
        ('உங்கள் பர்ஸும் எழுந்துவிட்டது', 'இன்றைய திட்டத்தைச் சொல்லுங்கள்.'),
        ('புதிய நாள், புதிய பக்கம்', 'இன்றைய செலவுகளை முடிவுசெய்யுங்கள்.'),
      ],
      'afternoon': [
        ('மதிய உணவு எப்படி? பதிந்தீர்களா?', 'இப்போதே சேர்த்துவிடுங்கள்.'),
        ('அந்த டீ செலவும் கணக்குதான்', 'சிறு செலவுகள்தான் பெரிதாகும்.'),
        ('நாளில் பாதி முடிந்தது', 'ஏதாவது செலவு? ஐந்து விநாடிதான்.'),
        ('ஒரு சிறிய சரிபார்ப்பு', 'தொகை நினைவிருக்கும்போதே பதியுங்கள்.'),
      ],
      'evening': [
        ('மாலை சரிபார்ப்பு', 'பர்ஸிலிருந்து ஏதாவது நழுவியதா?'),
        ('நாள் முடிகிறது', 'இன்றைய கணக்கை இப்போதே சேருங்கள்.'),
        ('உங்கள் பர்ஸுக்குப் பல கதைகள் உண்டு', 'மறப்பதற்கு முன் எழுதிவையுங்கள்.'),
        ('கணக்கு எழுத இதுவே நேரம்', 'இப்போது இரண்டு நிமிடம், பிறகு தெளிவு.'),
      ],
      'night': [
        ('இன்றைய செலவுகளைத் தூங்கவிடாதீர்கள்', 'மறப்பதற்கு முன் எழுதிவையுங்கள்.'),
        ('இன்றிரவின் கடைசி வேலை', 'கணக்கை முடித்து நிம்மதியாகத் தூங்குங்கள்.'),
        ('நாளை வர இன்னும் கொஞ்ச நேரம்தான்', 'இன்றைய செலவுகள் காத்திருக்கின்றன.'),
        ('தூங்குவதற்கு முன் ஒரு நிமிடம்', 'இன்றைய கணக்குக்குப் பத்து விநாடி போதும்.'),
      ],
    },
    'empty_day': {
      'afternoon': ('இன்று இன்னும் எதுவும் பதியவில்லை', 'செலவே இல்லையா, அல்லது மறந்துவிட்டீர்களா?'),
      'evening': ('இன்று ஒரு பதிவும் இல்லை', 'மறந்துவிட்டீர்களா? நொடியில் சேருங்கள்.'),
      'night': ('உங்கள் கணக்குப் புத்தகம் இன்னும் காலியாக உள்ளது', 'இன்று நடந்ததை எழுதிவையுங்கள்.'),
    },
    'spent_today': {1: 'இன்று 1 பதிவு, {money} செலவு', 'other': 'இன்று {count} பதிவுகள், {money} செலவு'},
    'logged_today': {1: 'இன்று 1 பதிவு சேர்க்கப்பட்டது', 'other': 'இன்று {count} பதிவுகள் சேர்க்கப்பட்டன'},
    'missed_evening': 'ஏதாவது விடுபட்டதா? இப்போதே சேருங்கள்.',
    'missed_night': 'தூங்கும் முன் வேறு ஏதாவது உண்டா?',
    'streak_title': 'உங்கள் {streak} நாள் தொடர் முறியப்போகிறது',
    'streak_body': 'ஒரு பதிவு போதும், தொடர் தொடரும்.',
    'action_add': 'செலவைச் சேர்',
    'action_snooze': '10 நிமிடத்தில் நினைவூட்டு',
  },
}


def copy_for(lang) -> dict:
  return COPY.get(lang) or COPY['en']


def counted(forms: dict, count: int, **values) -> str:
  text = forms[1] if count == 1 else forms['other']
  return text.format(count=count, **values)
