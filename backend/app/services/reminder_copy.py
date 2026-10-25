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
}


def copy_for(lang) -> dict:
  return COPY.get(lang) or COPY['en']


def counted(forms: dict, count: int, **values) -> str:
  text = forms[1] if count == 1 else forms['other']
  return text.format(count=count, **values)
