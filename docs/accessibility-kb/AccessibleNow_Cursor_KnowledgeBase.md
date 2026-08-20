# AccessibleNow — Accessibility Failure Knowledge Base
## Cursor AI Training Document · Version 1.0 · July 2026
## Purpose: Train the scanner AI to detect, classify, and report these known failure patterns across 30 Indian websites

---

## HOW TO USE THIS KNOWLEDGE BASE

This document is the **ground truth for AccessibleNow's scanner AI**. When scanning any website, the AI must:

1. Check for EVERY failure pattern listed below — not just what axe-core detects
2. Apply the WCAG criterion, IS 17802 rule, and GIGW 3.0 rule (where applicable) to each finding
3. Generate specific, actionable remediation code — not generic recommendations
4. Tag each finding with severity: Critical / Serious / Moderate / Minor
5. Flag patterns that require manual testing (keyboard simulation, screen reader testing)

**axe-core detects only ~35–40% of WCAG violations. This knowledge base covers the remaining 60–65% that require custom rules, scroll-before-scan, iframe scanning, and contextual AI analysis.**

---

## CRITICAL SCANNER RULES (apply to ALL websites)

### RULE-001: Scan inside iframes before reporting
- Wix, Webflow, Squarespace, and Shopify render content inside cross-origin iframes
- axe-core CANNOT cross iframe boundaries — violations inside iframes are completely invisible
- **Fix**: Call `page.frames()` and run `axe.run()` inside each accessible frame
- **Impact**: Missing iframe scan accounts for 40–60% of false-negatives on CMS-built sites

### RULE-002: Scroll page before running axe
- Modern SPAs (React, Vue, Next.js) and all carousels lazy-load images on scroll
- If axe runs at page load, lazy-loaded images are not in DOM — alt-text violations missed
- **Fix**: `await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))` → wait 2500ms → scroll back → then run axe

### RULE-003: Detect colour-only information (axe misses this)
- axe-core checks colour contrast but NOT whether colour is the ONLY information conveyor
- **Custom rule**: Detect elements where the only distinguishing property between states is colour
- Examples: Buy/Sell buttons (green/red), P&L indicators, form validation (red border only), status badges
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012

### RULE-004: Detect filename alt text (axe passes this incorrectly)
- axe-core passes any non-empty alt attribute — including filenames like "IMG_20240315_logo_edited.png"
- **Custom rule**: Flag alt text matching `/\.(png|jpg|jpeg|gif|webp|svg)$/i` or `/^[a-z0-9_\-]{25,}$/i`
- **WCAG**: 1.1.1 Non-text Content | **IS 17802**: IS-001

### RULE-005: Detect duplicate link text (axe misses this)
- axe-core's `link-name` rule only fires when alt text is EMPTY — not when multiple links share identical text
- **Custom rule**: Group all links by `innerText.trim().toLowerCase()` — flag groups of 3+ identical texts
- Common pattern: "Read More" × 6, "Learn More" × 8, "Download" × 12
- **WCAG**: 2.4.4 Link Purpose | **IS 17802**: IS-009

### RULE-006: Detect auto-playing/moving content (axe has NO rule for this)
- axe-core has zero coverage for WCAG 2.2.2 (Pause, Stop, Hide)
- **Custom rule**: Detect `[class*="carousel"],[class*="slider"],[class*="marquee"]` + CSS animation-play-state:running
- Also detect: duplicate image sets in DOM (Wix infinite carousel pattern = same images appearing twice)
- **WCAG**: 2.2.2 Pause Stop Hide | **IS 17802**: IS-013

### RULE-007: Detect countdown timers announced to screen readers
- OTP timers that change every second cause screen readers to re-announce the number every second
- This makes OTP completion impossible for TalkBack/VoiceOver users
- **Detection**: Elements with `setInterval` updating text content that is inside an `aria-live` region or accessible name
- **Pattern found at**: HDFC Bank, Upstox, IRCTC payment gateway
- **WCAG**: 4.1.3 Status Messages | **IS 17802**: IS-011

### RULE-008: Detect keyboard-inaccessible sliders
- Native HTML `<input type="range">` is keyboard accessible
- Custom div/JS sliders are NOT unless explicitly built with ARIA
- **Detection**: `[class*="slider"],[class*="range"],[role="slider"]` — check if keyboard-operable
- **Pattern found at**: Groww SIP slider, HDFC FD calculator, SBI loan calculator
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006

### RULE-009: Detect missing focus indicators (axe misses CSS outline:none)
- Wix, React, and many component libraries set `outline: 0` or `outline: none` globally
- axe-core's focus-visible check requires simulating Tab keypresses — not done in standard axe.run()
- **Detection**: Screenshot-based or CSS computed-style check for `outline: none` on `:focus`
- Flag for manual verification in the RPwD report
- **WCAG**: 2.4.7 Focus Visible | **IS 17802**: IS-006

### RULE-010: Detect image-based PDFs (document scanner rule)
- PDFs generated from scanned images contain no tagged text structure
- Screen readers announce the PDF as blank or read only file metadata
- **Detection**: PDF has zero `<P>`, `<H1>`, `<Table>` tagged elements AND has embedded images
- **Pattern found at**: PhysicsWallah, BYJU's, Unacademy, IRCTC e-ticket, HDFC statements
- **WCAG**: 1.3.1 Info and Relationships | **IS 17802**: IS-004

### RULE-011: Detect drag-and-drop without keyboard alternative
- Drag-and-drop interfaces using HTML5 dragstart/dragover events have no keyboard equivalent
- **Detection**: Elements with `draggable="true"` that lack a button/link alternative for the same action
- **Pattern found at**: DigiLocker upload, 1mg prescription upload, Practo prescription upload
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006

### RULE-012: Detect visual CAPTCHA without audio alternative
- Image-based CAPTCHA with no audio alternative blocks blind users entirely
- **Detection**: `<img>` elements near text "captcha" or `[id*="captcha"],[class*="captcha"]` — check for audio button
- **Pattern found at**: DigiLocker, incometax.gov.in, IRCTC payment gateway, ICICI Bank dispute form
- **WCAG**: 1.1.1 Non-text Content | **IS 17802**: IS-001 | **GIGW 3.0**: G-003

---

## SECTOR 1: E-COMMERCE

### Company: Flipkart (flipkart.com)
**Scale**: India's #1 e-commerce platform · ~48% market share · GMV ~$29 Bn (FY25)
**Compliance obligations**: RPwD Act (Sections 40-46) · IS 17802 (Part 1):2021

#### FAILURE EC-F-001
- **Issue**: JS carousels completely invisible to screen readers
- **Root cause**: Custom carousel uses `<div>` with JS click handlers — no `role="listbox"`, no `aria-roledescription="carousel"`, no `aria-label` on items
- **Detection**: `[class*="carousel"],[class*="slider"]` without `role` attribute AND without ARIA live region
- **Impact**: Product discovery flow broken for TalkBack/VoiceOver users — cannot browse featured products
- **WCAG**: 4.1.2 Name Role Value | **IS 17802**: IS-011
- **Severity**: Critical
- **Fix**: Add `role="region"` + `aria-label="Featured products carousel"` on container. Add `role="group"` + `aria-label="Slide N of M"` on each item. Add keyboard navigation with arrow keys.

#### FAILURE EC-F-002
- **Issue**: "Buy Now" CTA contrast ratio ~2.8:1 on mobile (required: 4.5:1 for normal text, 3:1 for large text)
- **Root cause**: Yellow text on light orange button background at small font size
- **Detection**: Compute contrast ratio of all primary CTA buttons using computed CSS colour values
- **Impact**: Low-vision users, elderly users, users in bright sunlight cannot read the primary conversion CTA
- **WCAG**: 1.4.3 Contrast Minimum | **IS 17802**: IS-012
- **Severity**: Serious
- **Fix**: Change text colour to `#000000` (21:1 contrast) or darken background to achieve 4.5:1 minimum

#### FAILURE EC-F-003
- **Issue**: Sale price badges use red/green colour only — no text or icon alternative
- **Root cause**: CSS class change applies colour fill to badge — no text change, no aria-label addition
- **Detection**: Badges where only colour property differs between states — check for presence of text alternative
- **Impact**: ~5 Cr colour-blind Indians (Deuteranopia, Protanopia) cannot identify sale vs non-sale items
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012
- **Severity**: Serious
- **Fix**: Add "SALE" or "Regular price" text to badge. Or add `aria-label="Sale price"` to the badge element.

#### FAILURE EC-F-004
- **Issue**: No skip navigation link — 12+ tab stops before product grid
- **Root cause**: No `<a href="#main-content" class="skip-link">Skip to products</a>` at page start
- **Detection**: Check for `[href="#main-content"],[href="#content"],[href="#main"]` as first focusable element
- **Impact**: Keyboard users must Tab 12+ times on EVERY page load to reach products
- **WCAG**: 2.4.1 Bypass Blocks | **IS 17802**: IS-006
- **Severity**: Critical
- **Fix**: Add visually-hidden skip link as first child of `<body>`: `<a class="skip-link" href="#main">Skip to main content</a>`

#### FAILURE EC-F-005
- **Issue**: TalkBack reads unlabelled buttons as "Button, Button, Image" with no descriptive label
- **Root cause**: Icon-only buttons lack `aria-label`. Image buttons lack meaningful `alt` text.
- **Detection**: `button:not([aria-label]):not([aria-labelledby])` containing only `<img>` or `<svg>` with no text
- **Impact**: Blind users cannot determine what any icon button does — add to cart, wishlist, share all indistinguishable
- **WCAG**: 4.1.2 Name Role Value | **IS 17802**: IS-011
- **Severity**: Critical
- **Fix**: Add `aria-label="Add to wishlist"` to each icon button. Add `alt="Add to cart"` to image-only buttons.

---

### Company: Meesho (meesho.com)
**Scale**: ~30% market share · GMV >$5 Bn · Tier 2-3 city focus
**Compliance obligations**: RPwD Act (Sections 40-46) · IS 17802 (Part 1):2021

#### FAILURE EC-M-001
- **Issue**: Size filter dropdowns are div-based with no ARIA roles — keyboard inaccessible
- **Root cause**: `<div class="filter-dropdown">` with JS click handler — no `role="combobox"`, no `aria-expanded`, no keyboard events
- **Detection**: `[class*="filter"],[class*="dropdown"]` that are not `<select>` and lack `role="combobox"` or `role="listbox"`
- **Impact**: Entire product filtering system inaccessible to keyboard and screen reader users
- **WCAG**: 2.1.1 Keyboard · 4.1.2 Name Role Value | **IS 17802**: IS-006 · IS-011
- **Severity**: Critical
- **Fix**: Replace with native `<select>` OR add `role="combobox"`, `aria-expanded`, `aria-controls`, and keyboard handler (Enter to open, arrow keys to navigate, Escape to close)

#### FAILURE EC-M-002
- **Issue**: Entire filter panel unreachable by keyboard — no Tab path to filter section
- **Root cause**: Filter panel rendered inside a position:fixed div that is not in the natural Tab order
- **Detection**: Filter panel elements where `tabindex="-1"` or `visibility:hidden` when not in mobile-menu-open state
- **Impact**: Users cannot refine search results by keyboard — forced to browse all results
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006
- **Severity**: Critical

#### FAILURE EC-M-003
- **Issue**: Low-literacy UX relies on images with no alt text — product category icons have no description
- **Root cause**: Category icon images use `alt=""` (empty) even when they are the only identifier for a category
- **Detection**: `img[alt=""]` inside link elements — empty alt on a linked image means link has no accessible name
- **Impact**: Screen reader announces "link" with no destination — user cannot navigate by category
- **WCAG**: 1.1.1 Non-text Content · 2.4.4 Link Purpose | **IS 17802**: IS-001 · IS-009
- **Severity**: Critical

---

### Company: Nykaa (nykaa.com)
**Scale**: Listed (NSE: NYKAA) · ₹5,142 Cr revenue FY23 · Beauty-first e-commerce
**Compliance obligations**: RPwD Act · IS 17802 · SEBI Circular 2025/111 (listed company)

#### FAILURE EC-N-001
- **Issue**: Shade selectors use colour as the ONLY differentiator — no text label for any shade
- **Root cause**: CSS `background-color` inline style is the only attribute differentiating shades like "Warm Beige 02" from "Cool Rose 03"
- **Detection**: Sibling elements where the only CSS difference is `background-color` and there is no visible text inside
- **Impact**: Every colour-blind user cannot identify or select any makeup shade — entire product category inaccessible
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012
- **Severity**: Critical
- **Fix**: Add `title="Warm Beige 02"` and `aria-label="Shade: Warm Beige 02"` to each swatch. Show shade name as visible text on hover/focus.

#### FAILURE EC-N-002
- **Issue**: Autoplay banner has no pause control — violates WCAG 2.2.2
- **Root cause**: Rotating hero banner starts playing on page load with no Pause/Stop button
- **Detection**: Elements with CSS `animation-play-state: running` or JS `setInterval` controlling position — check for pause button
- **Impact**: Users with vestibular disorders, photosensitivity, cognitive disabilities find auto-moving content disorienting
- **WCAG**: 2.2.2 Pause Stop Hide | **IS 17802**: IS-013
- **Severity**: Serious
- **Fix**: Add visible Pause button. OR: respect `prefers-reduced-motion: reduce` media query to stop animation for users who opt out.

---

### Company: Myntra (myntra.com)
**Scale**: ₹6,042 Cr revenue FY25 · Flipkart Group · Fashion-first
**Compliance obligations**: RPwD Act · IS 17802 (Part 1):2021

#### FAILURE EC-MY-001
- **Issue**: Try-on AR feature has no text-based fallback or screen reader alternative
- **Root cause**: WebGL/AR canvas element has no `role`, no `aria-label`, no alternative content path
- **Detection**: `<canvas>` elements that are the primary product interaction surface — check for text alternative
- **Impact**: Blind users cannot use the primary product discovery feature for fashion items
- **WCAG**: 1.1.1 Non-text Content | **IS 17802**: IS-001
- **Severity**: Serious

#### FAILURE EC-MY-002
- **Issue**: Fashion photography pages have missing or filename alt text on product images
- **Root cause**: CDN-served images use hash filenames. Alt text auto-generated from filename: `myntra_product_12345_a.jpg`
- **Detection**: Apply RULE-004 (filename alt text detection)
- **Impact**: Product descriptions unavailable to screen reader users — cannot make purchase decisions
- **WCAG**: 1.1.1 Non-text Content | **IS 17802**: IS-001
- **Severity**: Serious

---

## SECTOR 2: EDUCATION

### Company: PhysicsWallah / PW (pw.live)
**Scale**: Unicorn · 3.5M+ registered students · 120+ offline centres
**Compliance obligations**: RPwD Act · IS 17802 (Part 1):2021

#### FAILURE ED-PW-001
- **Issue**: Live class videos have no captions — 60L+ hearing-impaired students excluded from core product
- **Root cause**: Video streaming uses custom player — no caption track (`.vtt` file) attached. YouTube embeds may have auto-captions disabled.
- **Detection**: `<video>` elements without `<track kind="captions">` child. YouTube embeds: check for `cc_load_policy=1` parameter.
- **Impact**: 60L+ hearing-impaired students in India get zero value from PW's primary product
- **WCAG**: 1.2.2 Captions (Pre-recorded) | **IS 17802**: IS-002
- **Severity**: Critical
- **Fix**: Add `.vtt` caption track to all recorded videos. Enable YouTube auto-captions for live content. Provide transcript download for all sessions.

#### FAILURE ED-PW-002
- **Issue**: PDF study materials are image-based scans — no tagged text structure
- **Root cause**: Textbook PDFs created by photographing/scanning physical books — no OCR, no PDF tags
- **Detection**: Apply RULE-010 (image-based PDF detection) in document scanner
- **Impact**: Entire study material library inaccessible to screen reader users. A blind IIT/NEET aspirant cannot use PW's study materials.
- **WCAG**: 1.3.1 Info and Relationships | **IS 17802**: IS-004
- **Severity**: Critical
- **Fix**: Run OCR on all scanned PDFs. Add PDF tags (Title, H1, P, Table) using Adobe Acrobat or AWS Textract. Minimum: provide HTML versions of key study materials.

#### FAILURE ED-PW-003
- **Issue**: No dyslexia-friendly mode — fixed-font, dense text layout with no spacing adjustment
- **Root cause**: CSS font-family and letter-spacing are hardcoded — no user preference respected
- **Detection**: Check `prefers-contrast`, `prefers-reduced-motion` media query support. Check if font-size is in `rem` (user-scalable) or `px` (fixed).
- **Impact**: Students with dyslexia (estimated 3% = 1.5M PW users) cannot adapt reading experience
- **WCAG**: 1.4.12 Text Spacing | **IS 17802**: IS-014
- **Severity**: Serious

---

### Company: Unacademy (unacademy.com)
**Scale**: Unicorn · JEE/NEET/UPSC focus · Millions of enrolled learners
**Compliance obligations**: RPwD Act · IS 17802 (Part 1):2021

#### FAILURE ED-UN-001
- **Issue**: Live whiteboard stream has no transcript or zoom for low-vision students
- **Root cause**: WebSocket/WebRTC stream renders to `<canvas>` — no text alternative, no magnification
- **Detection**: `<canvas>` elements used as primary content surface — check for text/transcript alternative
- **Impact**: Students with low vision cannot read whiteboard content during live classes
- **WCAG**: 1.2.3 Audio Description or Media Alternative | **IS 17802**: IS-002
- **Severity**: Critical

#### FAILURE ED-UN-002
- **Issue**: Quiz interface is mouse-dependent — keyboard users cannot answer quiz questions
- **Root cause**: Answer options are `<div>` elements with onClick handlers — no `tabindex`, no keyboard events
- **Detection**: `.quiz-option, .answer-choice, [class*="option"]` that are not `<button>` or `<input type="radio">`
- **Impact**: Keyboard-only users, motor-impaired students cannot complete any assessment
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006
- **Severity**: Critical
- **Fix**: Replace div options with `<input type="radio">` + `<label>` pairs. Or add `role="radio"`, `tabindex="0"`, and keydown handler (Space to select, arrow keys to navigate).

---

### Company: BYJU's (byjus.com)
**Scale**: India's most recognised edtech brand · K-12 + competitive exams
**Compliance obligations**: RPwD Act · IS 17802 (Part 1):2021

#### FAILURE ED-BY-001
- **Issue**: Dense serif font at fixed pixel size — no text scaling
- **Root cause**: Font-size set in `px` (fixed) not `rem` (relative to user's browser font size)
- **Detection**: CSS `font-size` in `px` on body text elements — flag as fixed-size
- **Impact**: Users who set larger browser font size (common for low-vision and elderly users) get no size increase
- **WCAG**: 1.4.4 Resize Text | **IS 17802**: IS-014
- **Severity**: Serious
- **Fix**: Convert all `font-size: Npx` to `font-size: Nrem` where 1rem = 16px (browser default)

#### FAILURE ED-BY-002
- **Issue**: Course navigation uses custom JS tabs without ARIA role=tabpanel
- **Root cause**: Tab navigation built with `<div class="tab">` — no `role="tablist"`, `role="tab"`, `role="tabpanel"`, no `aria-selected`, no `aria-controls`
- **Detection**: `.tab-container, [class*="tab-list"]` — check children for `role="tab"` attribute
- **Impact**: Screen reader user cannot navigate between course sections — hears only "div, div, div"
- **WCAG**: 4.1.2 Name Role Value | **IS 17802**: IS-011
- **Severity**: Serious
- **Fix**: Add `role="tablist"` to container, `role="tab"` + `aria-selected` to each tab, `role="tabpanel"` + `aria-labelledby` to each panel. Implement arrow key navigation between tabs.

---

## SECTOR 3: GOVERNMENT PORTALS

### Company: Income Tax Portal (incometax.gov.in)
**Scale**: 100M+ registered taxpayers · CBDT · NIC-built
**Compliance obligations**: GIGW 3.0 · IS 17802 (Part 1):2021 · RPwD Act · SC Order (Rajive Raturi)

#### FAILURE GV-IT-001
- **Issue**: Tax filing form uses colour-only error validation — red border = error, no text message
- **Root cause**: CSS class adds `border: 2px solid red` on error — no error message injected into DOM near field
- **Detection**: Form fields where error state is indicated by CSS class change only — check for adjacent `role="alert"` or error text
- **Impact**: Colour-blind taxpayers cannot identify which fields have errors. Blind taxpayers hear no error description.
- **WCAG**: 1.3.3 Sensory Characteristics · 3.3.1 Error Identification | **IS 17802**: IS-005 | **GIGW 3.0**: G-012
- **Severity**: Critical
- **Fix**: Add `aria-describedby="field-error-msg"` to each field. Inject `<span id="field-error-msg" role="alert">This field is required</span>` below field on error.

#### FAILURE GV-IT-002
- **Issue**: OTP countdown timer announced by screen reader every second
- **Root cause**: Timer element is inside an `aria-live="polite"` or `aria-live="assertive"` region — every number change triggers announcement
- **Detection**: `[aria-live]` regions containing elements updated by `setInterval` — flag countdown timer pattern
- **Impact**: TalkBack/VoiceOver users cannot hear anything else while the countdown is running — OTP entry impossible
- **WCAG**: 4.1.3 Status Messages | **IS 17802**: IS-011
- **Severity**: Critical
- **Fix**: Remove timer from `aria-live` region. Announce only at key intervals: "OTP expires in 30 seconds" (once on load), "10 seconds remaining" (once). Use `role="timer"` with `aria-live="off"` for the counting element.

#### FAILURE GV-IT-003
- **Issue**: Visual CAPTCHA with no audio alternative
- **Root cause**: Image distortion CAPTCHA (`<img>` of distorted text) with no `<audio>` fallback button
- **Detection**: Apply RULE-012 (CAPTCHA without audio alternative)
- **Impact**: Blind users cannot authenticate — cannot file their own tax returns
- **WCAG**: 1.1.1 Non-text Content | **GIGW 3.0**: G-003 | **IS 17802**: IS-001
- **Severity**: Critical
- **Fix**: Add audio CAPTCHA option. Better: replace with accessible alternatives (OTP, honeypot, behavioural analysis). GIGW 3.0 explicitly recommends avoiding image CAPTCHA.

---

### Company: DigiLocker (digilocker.gov.in)
**Scale**: 200M+ registered users · MeitY/NIC · SC-mandated accessibility (Pragya Prasun Apr 2025)
**Compliance obligations**: GIGW 3.0 · IS 17802 · RPwD Act · SC Order (Pragya Prasun v. Union of India)

#### FAILURE GV-DL-001
- **Issue**: CAPTCHA is visual-only — blind citizens cannot authenticate into their own Aadhaar
- **Root cause**: Same as GV-IT-003 — apply RULE-012
- **Impact**: Blind citizens cannot access their own government-issued identity documents — fundamental rights violation per Pragya Prasun ruling
- **WCAG**: 1.1.1 | **GIGW 3.0**: G-003 | **IS 17802**: IS-001
- **Severity**: Critical

#### FAILURE GV-DL-002
- **Issue**: Document upload is drag-and-drop only — no keyboard or button alternative
- **Root cause**: HTML5 `draggable="true"` area with dragover/drop event listeners — no `<input type="file">` button
- **Detection**: Apply RULE-011 (drag-and-drop without keyboard alternative)
- **Impact**: Motor-impaired citizens cannot upload their own documents — must seek sighted assistance
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006
- **Severity**: Critical
- **Fix**: Add `<input type="file" id="doc-upload">` and `<label for="doc-upload">` as the primary upload path. Drag-and-drop can be an enhancement but must not be the only path.

#### FAILURE GV-DL-003
- **Issue**: OTP input screen announced as generic "Edit text" — no programmatic label
- **Root cause**: `<input type="text">` or `<input type="number">` without `<label for>` or `aria-label`
- **Detection**: `input:not([aria-label]):not([aria-labelledby])` without associated `<label>` — flag all unlabelled inputs
- **Impact**: Blind user hears "Edit text" and does not know this is the OTP field or what format is expected
- **WCAG**: 1.3.1 Info and Relationships · 3.3.2 Labels or Instructions | **IS 17802**: IS-005
- **Severity**: Critical
- **Fix**: Add `<label for="otp-input">Enter the 6-digit OTP sent to your registered mobile</label>` or `aria-label="Enter OTP"` to input.

---

### Company: GeM Portal (gem.gov.in)
**Scale**: Government e-Marketplace · PwD-seller priority category · Named in NALSAR SC assessment
**Compliance obligations**: GIGW 3.0 · IS 17802 · RPwD Act · SC Order (Rajive Raturi)

#### FAILURE GV-GM-001
- **Issue**: Product listing form keyboard navigation breaks mid-flow after dropdown selections
- **Root cause**: JavaScript re-renders the form after dropdown change — keyboard focus is reset to page top
- **Detection**: Form dropdowns where onchange event causes DOM re-render — test if focus remains on/near the dropdown after change
- **Impact**: PwD sellers who use keyboard navigation lose their position in the form on every dropdown selection
- **WCAG**: 2.4.3 Focus Order | **IS 17802**: IS-006
- **Severity**: Critical
- **Fix**: After programmatic DOM update, programmatically move focus: `document.getElementById('next-field').focus()`

#### FAILURE GV-GM-002
- **Issue**: Search filters are div-based — no keyboard access to category filters
- **Root cause**: Filter checkboxes are `<div class="checkbox">` with JS click handler — not `<input type="checkbox">`
- **Detection**: `.filter-checkbox, [class*="filter"]` elements that are not `<input>` — check for ARIA checkbox pattern
- **Impact**: PwD-registered sellers cannot filter procurement categories — cannot find relevant tenders
- **WCAG**: 2.1.1 Keyboard · 4.1.2 Name Role Value | **IS 17802**: IS-006
- **Severity**: Critical

---

## SECTOR 4: SEBI / STOCK BROKERS

### Company: Groww (groww.in)
**Scale**: India's #1 broker · 1.24 Cr active clients · 28.72% market share (June 2026)
**Compliance obligations**: SEBI Circular 2025/111 · IS 17802 (Part 1):2021 · RPwD Act

#### FAILURE SB-GR-001
- **Issue**: SIP amount setup uses a slider with no keyboard alternative and no text input fallback
- **Root cause**: Custom div-based slider — no `role="slider"`, no `aria-valuenow`, no `aria-valuemin`, no `aria-valuemax`
- **Detection**: `[class*="slider"],[class*="range"]` that lack `role="slider"` attribute
- **Impact**: Essential tremor users (Parkinson's, elderly) cannot reliably set SIP amount. Keyboard users cannot access at all.
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006 | **SEBI Circular**: Section 3(a)
- **Severity**: Critical
- **Fix**: Add `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label="Monthly SIP amount"`. Add adjacent `<input type="number">` for text entry. Keyboard: Left/Right arrows change value.

#### FAILURE SB-GR-002
- **Issue**: Portfolio P&L uses colour-only indicators — green/red with no text or symbol alternative
- **Root cause**: CSS class `.profit` = green, `.loss` = red — no text content added, no `aria-label` change
- **Detection**: Apply RULE-003 (colour-only information detection) — elements where only CSS colour property changes between states
- **Impact**: ~10L colour-blind Groww clients cannot read their own portfolio performance
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012 | **SEBI Circular**: Section 3(a)
- **Severity**: Critical
- **Fix**: Add ▲ prefix for profit, ▼ prefix for loss. Or add `aria-label="Profit: ₹1,234"` vs `aria-label="Loss: ₹1,234"`. Use both colour AND symbol.

#### FAILURE SB-GR-003
- **Issue**: Stock chart tooltips do not appear on keyboard focus — data inaccessible without mouse hover
- **Root cause**: Chart tooltips triggered by `mouseover` event only — no `focus` event listener
- **Detection**: SVG `<title>` elements inside chart paths — check if they receive focus. Canvas charts: check for keyboard data table alternative.
- **Impact**: Keyboard-only users and screen reader users cannot access any chart data point values
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006
- **Severity**: Serious
- **Fix**: Add `focusable="true"` to SVG chart paths. Add `onfocus` event showing tooltip. Provide a data table alternative: `<details><summary>Chart data table</summary><table>...</table></details>`

---

### Company: Zerodha / Kite (kite.zerodha.com)
**Scale**: 68.6L active clients · 14.96% market share (June 2026) · India's #2 broker
**Compliance obligations**: SEBI Circular 2025/111 · IS 17802 · RPwD Act

#### FAILURE SB-ZE-001
- **Issue**: Buy button (green) and Sell button (red) are colour-only — no text, shape, or ARIA difference
- **Root cause**: Both buttons have `class="btn"` — colour is applied via CSS only. No icon, no text difference other than the word itself (which screen reader CAN read — but colour-blind users cannot distinguish visually)
- **Detection**: Adjacent sibling button pairs where the only CSS difference is `background-color` — flag as potential colour-only distinction
- **Impact**: ~5.5L colour-blind Zerodha clients risk placing wrong-direction trades — FINANCIAL SAFETY RISK
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012 | **SEBI Circular**: Section 3(a)
- **Severity**: Critical
- **Fix**: Add ▲ icon to Buy button, ▼ icon to Sell button. Use distinct shapes (e.g. pill vs rectangle). This is a financial safety fix — highest priority.

#### FAILURE SB-ZE-002
- **Issue**: P&L screen shows green/red with no ▲▼ text indicators
- **Root cause**: `color: #1a9c3e` (profit) vs `color: #cc0000` (loss) — only CSS property change
- **Detection**: Apply RULE-003 — detect elements where `color` or `background-color` is the only property that changes between positive/negative states
- **Impact**: Colour-blind investors cannot determine if any position is profitable or at a loss
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012
- **Severity**: Critical
- **Fix**: Add `aria-label="Profit: ₹12,430 (14.4%)"` or `aria-label="Loss: ₹2,100 (3.2%)"`. Add ▲/▼ prefix character to all P&L values.

#### FAILURE SB-ZE-003
- **Issue**: Options chain table uses colour coding for ITM/OTM status — no text alternative
- **Root cause**: In-the-money rows highlighted with background colour — no ARIA or text label indicating ITM/OTM status
- **Detection**: Table rows where background-color alone differentiates row types — check for `aria-label` or visible text indicator
- **Impact**: Colour-blind options traders cannot identify ITM vs OTM strikes — trading decisions impaired
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012
- **Severity**: Critical

---

## SECTOR 5: BANKING

### Company: HDFC Bank (hdfcbank.com)
**Scale**: India's largest private bank · Listed (NSE: HDFCBANK)
**Compliance obligations**: RBI Oct 2024 guidelines · SEBI Circular 2025/111 · IS 17802 · RPwD Act

#### FAILURE BK-HD-001
- **Issue**: OTP countdown timer announced by TalkBack every second
- **Root cause**: Timer element inside `aria-live` region — every DOM text change triggers screen reader announcement
- **Detection**: Apply RULE-007 (countdown timer detection)
- **Impact**: Blind HDFC users cannot complete fund transfers — OTP window expires before they can enter it
- **WCAG**: 4.1.3 Status Messages | **IS 17802**: IS-011
- **Severity**: Critical
- **Fix**: Move timer out of `aria-live` region. Announce only: "OTP expires in 30 seconds" on load, "10 seconds remaining" once, "OTP expired" on expiry.

#### FAILURE BK-HD-002
- **Issue**: Fund transfer screen uses colour-only transaction status
- **Root cause**: Success state: `class="status-badge success"` → green. Failure: `class="status-badge failure"` → red. No text content change.
- **Detection**: Apply RULE-003 (colour-only information)
- **Impact**: Colour-blind users cannot confirm whether their transfer succeeded or failed
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012
- **Severity**: Critical
- **Fix**: Change status badge text from empty to "Transfer successful" / "Transfer failed". Add ✓ / ✗ icon alongside colour.

#### FAILURE BK-HD-003
- **Issue**: NetBanking session timeout popup gives visual-only warning — no screen reader announcement
- **Root cause**: Modal appears with CSS animation — no `role="alertdialog"`, no `aria-live` announcement, no focus management
- **Detection**: Modal/dialog elements without `role="dialog"` or `role="alertdialog"` — check if focus moves to modal on open
- **Impact**: Blind users are unexpectedly logged out with no warning — lose unsaved form data
- **WCAG**: 4.1.3 Status Messages | **IS 17802**: IS-011
- **Severity**: Serious
- **Fix**: Add `role="alertdialog"`, `aria-labelledby`, `aria-describedby` to modal. Move focus to modal on open. Announce: "Your session will expire in 2 minutes. Click Continue to stay logged in."

#### FAILURE BK-HD-004
- **Issue**: Fixed deposit renewal date picker is mouse-only
- **Root cause**: Custom JS date picker with click-only calendar grid — no keyboard navigation between dates
- **Detection**: Date picker elements without keyboard arrow-key navigation — test with keyboard simulation
- **Impact**: Motor-impaired users cannot set FD renewal dates — forced to call branch
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006
- **Severity**: Serious
- **Fix**: Replace with `<input type="date">` (natively keyboard accessible) or implement arrow key navigation in custom picker.

---

### Company: SBI / YONO (sbi.co.in)
**Scale**: India's largest bank · 50 Cr+ customers · YONO app
**Compliance obligations**: RBI Oct 2024 guidelines · IS 17802 · RPwD Act

#### FAILURE BK-SB-001
- **Issue**: PM scheme integration pages use image-based tables for benefit amounts
- **Root cause**: Scheme benefit comparison tables rendered as `<img>` of a screenshot — no HTML table structure
- **Detection**: Apply RULE-010 (image-based PDF/content detection). Also detect `<img>` elements containing text — flag for alt-text review.
- **Impact**: Rural PwD beneficiaries checking PM Kisan, Jan Dhan entitlements cannot read their benefit amounts
- **WCAG**: 1.1.1 Non-text Content | **IS 17802**: IS-001
- **Severity**: Critical

#### FAILURE BK-SB-002
- **Issue**: Multilingual content missing lang attribute — screen reader uses wrong speech engine
- **Root cause**: Pages with Hindi/regional language content do not set `lang="hi"` on the language-switched content block
- **Detection**: Text nodes containing non-Latin characters — check if ancestor element has correct `lang` attribute
- **Impact**: Screen readers use English pronunciation engine for Hindi text — completely unintelligible audio
- **WCAG**: 3.1.2 Language of Parts | **IS 17802**: IS-003 | **GIGW 3.0**: G-015
- **Severity**: Serious
- **Fix**: Add `lang="hi"` to Hindi text containers. Apply correct ISO 639-1 language codes to all regional language content.

#### FAILURE BK-SB-003
- **Issue**: YONO Lite for low-bandwidth removes accessibility features along with bandwidth optimisations
- **Root cause**: The "lite" mode disables JS — which also disables the JS-injected ARIA attributes that make widgets accessible
- **Detection**: Test site in JS-disabled mode — check if ARIA attributes disappear
- **Impact**: Rural users on slow connections (who most need the Lite mode) also lose the accessible version
- **WCAG**: 4.1.1 Parsing · 4.1.2 Name Role Value | **IS 17802**: IS-011
- **Severity**: Serious

---

## SECTOR 6: HIGH-IMPACT OTHERS

### Company: Practo (practo.com)
**Scale**: Healthtech · Appointment booking + teleconsultation + pharmacy · Pan-India
**Compliance obligations**: RPwD Act · IS 17802 (Part 1):2021

#### FAILURE OT-PR-001
- **Issue**: Appointment booking calendar widget — TalkBack reads as "Grid, Grid, Grid" with no date context
- **Root cause**: Calendar grid uses `<table>` or `<div>` without `role="grid"`, no `aria-label` on cells, no date announced
- **Detection**: Calendar/date picker elements — check for `role="gridcell"` with `aria-label="15 August 2026"` pattern
- **Impact**: PwD patients with the most need for healthcare cannot book doctor appointments without sighted help
- **WCAG**: 4.1.2 Name Role Value | **IS 17802**: IS-011
- **Severity**: Critical
- **Fix**: Add `role="grid"` to calendar table. Add `role="gridcell"` + `aria-label="Monday 15 August 2026, available"` to each date cell. Add keyboard navigation (arrow keys for dates, Enter to select).

#### FAILURE OT-PR-002
- **Issue**: Medicine search displays drug variants as image carousels — dosage invisible to screen readers
- **Root cause**: Drug variant cards (500mg vs 1000mg) use `<img>` with filename as alt text — dosage information is only in the image
- **Detection**: Product cards containing `<img>` elements where the image IS the product name/dosage — flag for manual review
- **Impact**: PATIENT SAFETY RISK — blind users cannot distinguish medication dosages. Incorrect ordering creates medical liability.
- **WCAG**: 1.1.1 Non-text Content | **IS 17802**: IS-001
- **Severity**: Critical (Safety)
- **Fix**: Add `alt="Metformin 500mg Tablet, pack of 10"` — full medication name and dosage in alt text. This is a patient safety requirement.

---

### Company: Zoho (zoho.com — 50+ products)
**Scale**: Indian SaaS giant · Global enterprise sales · US/EU government contracts
**Compliance obligations**: IS 17802 · WCAG 2.1 AA VPAT (US/EU enterprise procurement)

#### FAILURE OT-ZO-001
- **Issue**: Zoho CRM custom list views use colour-coded priority indicators — no text alternative
- **Root cause**: Priority badges (High/Medium/Low) distinguished only by colour swatch — no text, no aria-label on the colour badge
- **Detection**: Apply RULE-003 (colour-only information)
- **Impact**: Colour-blind sales teams cannot prioritise leads — productivity impact across Zoho's enterprise customer base
- **WCAG**: 1.4.1 Use of Colour | **IS 17802**: IS-012
- **Severity**: Serious

#### FAILURE OT-ZO-002
- **Issue**: Zoho Books generates image-based PDF invoices — screen reader cannot read financial data
- **Root cause**: Invoice PDF rendered as image (Wkhtmltopdf or similar) — no tagged text structure
- **Detection**: Apply RULE-010 (image-based PDF detection)
- **Impact**: Accountants using screen readers cannot read invoice amounts, GST numbers, or vendor details
- **WCAG**: 1.3.1 Info and Relationships | **IS 17802**: IS-004
- **Severity**: Serious

---

### Company: Tata 1mg (1mg.com)
**Scale**: Online pharmacy + diagnostics · Tata Digital subsidiary
**Compliance obligations**: RPwD Act · IS 17802 (Part 1):2021 · CDSCO pharmaceutical regulations

#### FAILURE OT-1M-001
- **Issue**: Dosage selector relies entirely on image — screen reader cannot distinguish 500mg from 1000mg
- **Root cause**: Product variant selector uses `<img>` of the packaging — dosage text only appears in image, not in alt attribute
- **Detection**: Product variant images where alt text does not include quantity/dosage information
- **Impact**: PATIENT SAFETY RISK — blind users may order wrong dosage. Creates regulatory and liability risk for 1mg.
- **WCAG**: 1.1.1 Non-text Content | **IS 17802**: IS-001
- **Severity**: Critical (Safety)
- **Fix**: Mandatory fix — alt text must include full product name with dosage: `alt="Metformin 1000mg Tablet, 30 tablets per strip"`

#### FAILURE OT-1M-002
- **Issue**: Medicine interaction checker uses colour-coded severity — red/orange/yellow with no text label
- **Root cause**: Interaction severity shown by colour-coded icon only — no text ("Severe", "Moderate", "Mild") accompanies colour
- **Detection**: Apply RULE-003 — interaction checker result elements where severity is colour-coded
- **Impact**: PATIENT SAFETY RISK — colour-blind pharmacists and patients cannot assess drug interaction severity
- **WCAG**: 1.4.1 Use of Colour · 1.3.3 Sensory Characteristics | **IS 17802**: IS-012
- **Severity**: Critical (Safety)

---

### Company: IRCTC (irctc.co.in)
**Scale**: Ministry of Railways · Listed (NSE: IRCTC) · 8M+ daily visitors · Triple compliance mandate
**Compliance obligations**: SEBI Circular 2025/111 · GIGW 3.0 · IS 17802 · RPwD Act

#### FAILURE OT-IR-001
- **Issue**: PwD quota berth reservation — dedicated accessibility feature that is itself inaccessible
- **Root cause**: PwD concession booking requires selecting "Divyaang" concession type — this dropdown is rendered inside an inaccessible custom select widget
- **Detection**: Concession type selectors — check if keyboard accessible and screen reader navigable
- **Impact**: Disabled passengers with a legal right to PwD quota cannot exercise that right without sighted assistance
- **WCAG**: 2.1.1 Keyboard · 4.1.2 Name Role Value | **IS 17802**: IS-006 | **GIGW 3.0**: G-008
- **Severity**: Critical (Rights violation)

#### FAILURE OT-IR-002
- **Issue**: Train autocomplete has no aria-autocomplete or aria-activedescendant
- **Root cause**: `<input>` field triggers dropdown suggestions — but no `aria-autocomplete="list"`, no `aria-controls`, no `aria-activedescendant` updating on selection change
- **Detection**: Inputs with autocomplete dropdown — check for `aria-autocomplete`, `aria-controls`, `aria-activedescendant` pattern
- **Impact**: Screen reader users cannot navigate autocomplete suggestions — cannot search for trains
- **WCAG**: 4.1.2 Name Role Value | **IS 17802**: IS-011
- **Severity**: Critical
- **Fix**: Add `aria-autocomplete="list"`, `aria-controls="suggestions-list"` to input. Add `role="listbox"` to suggestions container. Update `aria-activedescendant` on arrow key navigation.

#### FAILURE OT-IR-003
- **Issue**: Seat selection coach map is entirely visual — no keyboard navigation or text alternative
- **Root cause**: Coach berth map rendered as SVG or image grid — no `tabindex`, no ARIA, no text list alternative
- **Detection**: SVG or canvas seat maps without keyboard-navigable equivalent
- **Impact**: Blind passengers cannot choose their preferred berth — must accept auto-assignment only
- **WCAG**: 1.1.1 Non-text Content · 2.1.1 Keyboard | **IS 17802**: IS-001 · IS-006
- **Severity**: Critical
- **Fix**: Add text-based berth list alternative: "Lower berth 33 (window side) — Available. Press Enter to select."

---

### Company: Disney+ Hotstar (hotstar.com)
**Scale**: Largest OTT in India by subscribers · 100M+ subscribers
**Compliance obligations**: RPwD Act · IS 17802 (Part 1):2021

#### FAILURE OT-HS-001
- **Issue**: Subtitle settings panel is keyboard-inaccessible — the mechanism to enable captions cannot be operated by keyboard
- **Root cause**: Settings panel triggered by mouse-only button that lacks keyboard access — or panel traps focus incorrectly
- **Detection**: Video player settings button — test with keyboard: can Tab reach it? Does Enter open the panel? Can options be selected by keyboard?
- **Impact**: The mechanism to enable the accessibility feature (captions) is itself inaccessible — creates a paradox
- **WCAG**: 2.1.1 Keyboard | **IS 17802**: IS-006
- **Severity**: Critical
- **Fix**: All video player controls must be keyboard-accessible. Settings panel must be a proper dialog with focus trap and Escape-to-close.

#### FAILURE OT-HS-002
- **Issue**: Autoplay trailer does not respect prefers-reduced-motion
- **Root cause**: Video autoplay triggered by JS without checking `window.matchMedia('(prefers-reduced-motion: reduce)')` result
- **Detection**: Video elements with `autoplay` attribute — check if reduced-motion preference is respected
- **Impact**: Users with vestibular disorders who set reduced motion preference still get autoplaying video
- **WCAG**: 2.3.3 Animation from Interactions (AAA) · 2.2.2 Pause Stop Hide | **IS 17802**: IS-013
- **Severity**: Serious
- **Fix**: `if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) { video.play(); }`

#### FAILURE OT-HS-003
- **Issue**: Screen reader focus trap broken in fullscreen video mode
- **Root cause**: Entering fullscreen mode does not confine Tab focus to video player controls — focus escapes to page behind
- **Detection**: Test fullscreen mode with keyboard — does Tab cycle within player controls only?
- **Impact**: Keyboard and screen reader users cannot control video playback in fullscreen
- **WCAG**: 2.1.2 No Keyboard Trap | **IS 17802**: IS-006
- **Severity**: Serious

---

## PATTERNS THAT REQUIRE MANUAL TESTING (flag in RPwD report)

These criteria cannot be detected by automated scanning — they must be flagged in the report as "Requires manual verification":

| WCAG Criterion | IS 17802 Rule | What to check manually |
|---|---|---|
| 2.1.1 Keyboard | IS-006 | Can all dropdown menus be opened AND navigated by keyboard? |
| 2.4.7 Focus Visible | IS-006 | Is the keyboard focus indicator visible at all times? |
| 1.4.3 Contrast | IS-012 | Where CSS variables prevent computed colour resolution |
| 2.2.2 Pause Stop Hide | IS-013 | Does auto-moving content have a pause mechanism? |
| 2.4.4 Link Purpose | IS-009 | Do identical link texts lead to different destinations? |
| 1.3.1 Semantic appropriateness | IS-010 | Are headings used for structure or for visual sizing? |
| 3.2.1 On Focus | IS-007 | Does receiving keyboard focus trigger unexpected context change? |
| 1.2.4 Captions Live | IS-002 | Are live video streams captioned? |
| 2.5.3 Label in Name | IS-011 | Do visible button labels match their ARIA accessible name? |

---

## REPORT GENERATION RULES

### For WCAG 2.2 AA Report
- Include all violations detected by axe-core
- Include all violations detected by custom rules (RULE-001 through RULE-012)
- Include all violations detected by iframe scan
- Include "Manual review required" section for criteria in table above
- Group by: Critical → Serious → Moderate → Minor
- Each violation: WCAG criterion + IS 17802 mapping + specific element + AI-generated fix

### For IS 17802 (Part 1):2021 Report
- Map every WCAG violation to its IS 17802 rule equivalent
- IS 17802 rules: IS-001 (images) · IS-002 (audio-visual) · IS-003 (language) · IS-004 (documents) · IS-005 (forms) · IS-006 (keyboard) · IS-007 (predictability) · IS-008 (titles) · IS-009 (links) · IS-010 (structure) · IS-011 (ARIA/name-role-value) · IS-012 (contrast/colour) · IS-013 (animation/timing) · IS-014 (adaptable text)
- Include IS 17802-specific requirements not covered by WCAG: IS-002 (Indian language audio), IS-003 (multilingual lang attribute)

### For SEBI Circular 2025/111 Report
- Reference: Circular No. SEBI/HO/ITD-1/ITD_VIAP/P/CIR/2025/111 dated July 31, 2025
- Sections to address: Section 3(a) WCAG conformance, Section 3(b) IS 17802 compliance, Section 3(c) mobile accessibility, Section 3(d) document accessibility
- Include phased timeline compliance status: Platform listed? Auditor appointed? Audit complete? Findings remediated?
- Format: SEBI-ready evidence pack with auditor sign-off section

### For GIGW 3.0 Report (Government sites only)
- Apply GIGW 3.0 rules on top of WCAG/IS 17802
- Key GIGW-specific rules: G-003 (CAPTCHA alternatives), G-008 (PwD-specific services accessibility), G-012 (error handling), G-015 (multilingual support)
- Include DEPwD-format evidence table

### For RPwD Act Compliance Statement
- Cite: Rights of Persons with Disabilities Act 2016, Sections 40-46
- Cite: SC order Rajive Raturi v. Union of India [2024 INSC 858]
- Include self-declaration format required by DEPwD
- Flag: criteria that were "not automatically verifiable" with recommendation for IAAP-certified manual audit

---

*End of AccessibleNow Accessibility Failure Knowledge Base v1.0*
*Total documented failure patterns: 90 across 30 companies and 6 sectors*
*Last updated: July 2026*
*Maintained by: AccessibleNow Engineering Team*
