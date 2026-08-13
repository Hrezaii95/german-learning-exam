# P5 rich illustrations: rapid production report

Date: 2026-08-13  
Generator: built-in OpenAI image generation tool  
Reference role: the three UI reference boards under `resources/project-context/ui-reference/` were used only to calibrate polish, line quality, palette, and responsive scene density. No source character or composition was copied.

## Delivered assets

All three production-bound assets are 1536 x 1024 PNG (3:2 landscape), contain no intended text, logo, flag, UI chrome, or watermark, and retain generous crop-safe areas for desktop, tablet, and mobile cards.

| Asset | Intended use | SHA-256 |
|---|---|---|
| `media/generated/illustrations-v1/lesson-1-greetings-dayparts.png` | Lesson 1 greetings hero and time-of-day greeting cards | `18BDBCFE872D4468DF413B149DAD99AFD7AB049346D8BD14E800B1F32173285D` |
| `media/generated/illustrations-v1/verbs-arbeiten-sein-context.png` | Verb detail/context panel for `arbeiten` and `sein` | `7308C1397A3C836F7145F22F0BB010A90A885DFAAA4F02D699C6F51EF2B0FF09` |
| `media/generated/illustrations-v1/conversation-question-answer.png` | Question-and-answer/conversation practice hero | `6CAC90C40B0F47469A5A496D7F61BFA978BA4F655CC1DC0A47D9B71E18A8B95D` |

## Visual validation

### Lesson 1 greetings

- Pass: rich character-led scene closes the largest gap versus the original mock boards.
- Pass: morning, daytime, and evening are distinguished by lighting, environment, and repeated greeting gestures without relying on text.
- Pass: six original adult characters, varied settings, legible expressions and hand gestures.
- Pass: the left, center, and right thirds can be cropped independently for responsive cards.
- Pass: no visible words, labels, logo, watermark, flag, or UI shell.
- Note: this is intentionally more detailed than a single vocabulary cutout; use a focal crop rather than shrinking the full image into very small cards.

### `arbeiten` / `sein` context

- Pass: the working action is explicit through posture, laptop, desk, notebook, and professional clothing.
- Pass: identity and state are communicated through a portrait badge without text, mirror, role clothing, clock, weather, warm drink, and a relaxed state vignette.
- Pass: clean off-white field and right-hand vignette align with the mock system's modular educational panels.
- Pass: no visible words, labels, logo, watermark, flag, or UI shell.
- Note: the window intentionally combines sunny/cloudy/rain cues as an educational state metaphor rather than a physically literal single weather view.

### Conversation / Q&A

- Pass: readable turn-taking is carried by eye contact, an open-hand question gesture, and attentive response.
- Pass: blank badge, postcard image, notebook, and work bag support name/origin/profession prompts without text.
- Pass: strong waist-up crop and generous side margins work as a wide lesson hero or two-column card.
- Pass: no visible words, labels, logo, watermark, flag, speech bubbles, or UI shell.

## Final prompts

### `lesson-1-greetings-dayparts.png`

```text
Use case: illustration-story
Asset type: responsive lesson hero illustration for a premium German-learning web app
Primary request: Create one polished wide 2D editorial illustration that teaches greetings through context alone. Show a continuous triptych-like urban neighborhood scene transitioning naturally from early morning on the left, bright daytime in the center, and warm evening on the right. In each time zone, two friendly adults greet each other with clear natural gestures: a morning wave near a bakery and bicycle, a daytime greeting near a cafe or workplace, and an evening farewell near warm apartment windows and street lamps.
Style/medium: premium modern educational editorial illustration; crisp confident dark linework, expressive diverse adult characters, smooth cel shading, subtle paper-like texture, dimensional but clean; comparable in finish to a high-quality language-learning app, entirely original.
Composition/framing: wide landscape 3:2, three coherent visual zones flowing into one scene; central visual focus; generous safe margins; characters large enough to crop for tablet/mobile.
Lighting/mood: fresh blue-gold sunrise, clear cheerful midday, cozy violet-orange dusk; welcoming and calm.
Color palette: navy outlines, sky blue, warm yellow, coral accents, restrained violet; white and pale neutral breathing room.
Constraints: absolutely no written words, letters, numbers, speech bubbles, logos, flags, UI chrome, captions, or watermarks. Do not copy any exact character, costume, pose, or composition from a reference. Avoid childish clip-art, stock-vector stiffness, photorealism, 3D render, excessive detail, or tiny faces.
```

### `verbs-arbeiten-sein-context.png`

```text
Use case: scientific-educational
Asset type: responsive contextual illustration for German verb learning
Primary request: Create a polished wide 2D editorial learning scene that visually communicates both "to work" and "to be" without any text. Feature one friendly adult professional actively working at a laptop at a tidy desk, clearly engaged in a task. Around the main person, integrate elegant contextual identity and state cues as real scene elements: an ID-style portrait card with no readable text, a coat and work bag indicating role, a clock indicating current time, a mirror reflection, a steaming drink, and a nearby window showing changing weather. Include a second small vignette within the same composition where the same person is standing relaxed, tired but content, to convey a state of being.
Style/medium: premium modern language-learning editorial illustration, original characters, crisp dark linework, smooth cel shading, subtle texture, clean shapes, expressive face and hands; sophisticated rather than childish.
Composition/framing: wide landscape 3:2, main working figure left-center, identity/state cues arranged clearly around them, second state vignette on right; strong hierarchy and ample safe margins for responsive crops.
Lighting/mood: bright soft daylight, focused and encouraging.
Color palette: deep navy, cobalt blue, mint green, warm yellow, coral and restrained lavender on an off-white background.
Constraints: no written words, letters, numbers, labels, speech bubbles, logos, flags, UI elements, captions, or watermarks. No floating random icons; every cue should feel anchored in the scene. Avoid photorealism, 3D, flat generic stock art, anatomy errors, clutter, and tiny characters.
```

### `conversation-question-answer.png`

```text
Use case: illustration-story
Asset type: responsive conversation practice hero for a premium German-learning app
Primary request: Create a polished wide 2D editorial scene of two adult learners meeting for the first time in a welcoming contemporary public space, such as a library cafe. One person asks a friendly question with an open-hand gesture; the other listens and replies warmly. Their posture, eye contact, and turn-taking should clearly convey a question-and-answer exchange without speech bubbles. Include subtle visual context for name, origin, and profession through grounded props only: a blank name badge shape, a travel postcard with no writing, and a work notebook or tool bag.
Style/medium: premium modern educational editorial illustration with crisp dark linework, smooth cel shading, subtle texture, expressive diverse characters, warm human emotion, entirely original.
Composition/framing: wide landscape 3:2, two waist-up figures balanced across the frame with a conversational gap, readable hands and faces, simple depth-rich background, safe margins for desktop/tablet/mobile crop.
Lighting/mood: soft warm daylight, trustworthy, energetic, welcoming.
Color palette: deep navy, purple, cobalt, coral, warm yellow, mint and off-white.
Constraints: absolutely no text, letters, numbers, logos, flags, speech bubbles, captions, UI chrome, or watermarks. Do not copy exact characters or compositions from references. Avoid photorealism, 3D, childish clip-art, frozen stock poses, clutter, and visual ambiguity.
```

## Integration guidance

- Use `object-fit: cover` with an author-controlled focal position, not a simple full-image shrink, for cards below roughly 480 px wide.
- Recommended crop anchors: greetings `center`; verbs `center`; conversation `center 42%`.
- Keep German labels, article/gender color coding, conjugation endings, and audio controls in accessible HTML beside the image. These illustrations supply context and memory cues; they are not replacements for semantic instructional content.
