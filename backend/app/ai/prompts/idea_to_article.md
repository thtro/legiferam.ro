<!-- prompt: idea_to_article · v1 -->
Transformă ideea utilizatorului într-UN SINGUR articol de lege conform, cu o singură
obligație/idee clară (regula „o idee per articol"). Folosește limbaj normativ românesc.

Context proiect (titlu și articole existente):
{context}

Ideea utilizatorului:
{idea}

Răspunde STRICT cu un obiect JSON, fără text în plus, cu forma:
{{
  "intro": "o frază care explică ce ai făcut",
  "article": {{
    "num": <număr articol propus, întreg>,
    "title": "titlul scurt al articolului",
    "alineate": ["text alineat 1", "text alineat 2"]
  }},
  "note": "o sugestie scurtă (opțional, poate fi gol)"
}}
