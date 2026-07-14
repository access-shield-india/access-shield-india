# AccessShield India - Testing Guide for Session B

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/nileshvarma/Documents/AccessShield/SourceCode
pnpm install
```

### 2. Environment Setup

**Web App** (`apps/web` — env from monorepo root `.env.local`):

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CDN_URL=http://localhost:5000
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_AUTH_CLIENT_ID=accessshield-web
AUTH_ISSUER_URL=http://localhost:8080/realms/accessshield
AUTH_SECRET=dev-auth-secret-change-me
NEXTAUTH_URL=http://localhost:3000
```

**API** (same root `.env.local`):

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/accessshield
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://accessshield:accessshield@localhost:5672
AUTH_ISSUER_URL=http://localhost:8080/realms/accessshield
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=accessshield
KEYCLOAK_ADMIN_CLIENT_ID=accessshield-api
KEYCLOAK_ADMIN_CLIENT_SECRET=accessshield-api-dev-secret
JWT_SECRET=your-jwt-secret
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
S3_BUCKET_NAME=accessshield-data-dev
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin

# Jira Integration (optional for testing)
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
JIRA_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Start Development Servers

**Option A: Start All Services**

```bash
# Terminal 1 - Web app
cd apps/web
pnpm dev

# Terminal 2 - API
cd apps/api
pnpm dev

# Terminal 3 - AI Service (if needed)
cd apps/ai-service
pnpm dev
```

**Option B: Use Turborepo (Recommended)**

```bash
# From root - starts all apps in parallel
pnpm dev
```

### 4. Access the Application

- **Web Portal:** http://localhost:3000
- **API:** http://localhost:4000
- **API Health:** http://localhost:4000/health

---

## Testing Session B Features

### A. Issues Tracker

#### 1. Issue List Page

**URL:** http://localhost:3000/dashboard/issues

**Test Cases:**

- [ ] Page loads without errors
- [ ] Four summary stat pills display: Open, In Progress, Resolved, Critical
- [ ] Search box is visible and functional
- [ ] All filter dropdowns work:
  - Status (All / Open / In Progress / Resolved / Won't Fix)
  - Severity (All / Critical / Serious / Moderate / Minor)
  - Assignee (All / Me / Unassigned)
  - Asset dropdown
  - WCAG Criterion text input
  - Date range (From/To)
- [ ] "Clear filters" button appears when filters active
- [ ] Filter count badge shows correct number
- [ ] Issue table displays with columns: Issue, Asset, Assignee, Status, Due Date, Actions
- [ ] Severity badges show icon + color + text (not color alone)
- [ ] Overdue issues show red icon + "Overdue" text
- [ ] "View" button links to detail page
- [ ] Pagination works (if > 25 issues)

**Keyboard Navigation:**

- [ ] Tab reaches all interactive elements
- [ ] Enter submits search form
- [ ] Arrow keys navigate Select dropdowns
- [ ] Focus indicators visible (2px ring)

**Accessibility:**

```bash
# Run axe-core on issues page
cd apps/web
pnpm test:a11y src/components/dashboard/issues/
```

#### 2. Issue Detail Page

**URL:** http://localhost:3000/dashboard/issues/[id]

**Test Cases:**

- [ ] Breadcrumb navigation works
- [ ] Issue title and description display
- [ ] Severity badge shows (icon + color + text)
- [ ] WCAG criterion linked to W3C documentation (opens new tab)
- [ ] Standard badges show: WCAG 2.2, IS 17802, GIGW 3.0
- [ ] "View violating element HTML" details/summary works
- [ ] Element HTML code block is readable (monospace, dark theme)
- [ ] Copy button works for element HTML
- [ ] CSS selector displays with copy button
- [ ] Page URL link opens in new tab
- [ ] Screenshot viewer shows both desktop and mobile views
- [ ] Desktop/Mobile toggle buttons work (aria-pressed updates)

**Left Column - AI Fix Panel:**

- [ ] Three tabs visible: "AI Fix Suggestion", "Plain English Explanation", "Alt Text" (image-alt only)
- [ ] Loading state shows when fix not ready: spinner + "Generating fix suggestion..."
- [ ] Polling happens every 5 seconds (check Network tab)
- [ ] Once loaded, diff viewer shows before/after
- [ ] Copy button works for fixed HTML
- [ ] "Apply to Jira" button appears (or "Already synced to Jira" if linked)
- [ ] Plain English tab shows explanation + legal reference
- [ ] Business impact warning for critical violations
- [ ] Alt text tab (image-alt only): suggestion + "Mark as decorative" checkbox with warning

**Right Column - Metadata & Workflow:**

- [ ] Current status badge displays correctly
- [ ] Workflow buttons show based on current status:
  - Open → "Start Working"
  - In Progress → "Mark Resolved"
  - Resolved → "Reopen" or "Close Issue"
- [ ] "Won't Fix" button opens modal with required reason textarea
- [ ] Optimistic updates work (status changes immediately)
- [ ] Priority/Severity dropdown works
- [ ] Assignee dropdown shows team members
- [ ] Asset link navigates to asset detail
- [ ] Due date picker works (DD/MM/YYYY format)
- [ ] Labels display (if any)
- [ ] Jira issue key links to Jira (if synced)

**Comment Thread:**

- [ ] Comments display in chronological order
- [ ] Each comment shows: avatar, name, role, time
- [ ] Relative timestamps work: "5 mins ago", "2 hours ago"
- [ ] Absolute time in title attribute (DD/MM/YYYY HH:MM)
- [ ] Comment form: textarea + "Post comment" button
- [ ] Markdown support hint shows
- [ ] Optimistic update: comment appears immediately on submit
- [ ] Comment count badge updates

**Keyboard Navigation:**

- [ ] Tab order: breadcrumb → tabs → form fields → buttons
- [ ] Arrow keys switch tabs
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals

---

### B. Reports

**URL:** http://localhost:3000/dashboard/reports

**Test Cases:**

- [ ] "Generate New Report" button opens sliding panel from right
- [ ] Panel slides in with animation (or no animation if prefers-reduced-motion)
- [ ] Close button (X) works
- [ ] Clicking backdrop closes panel

**Generate Report Form:**

- [ ] Six report types visible with radio buttons:
  1. Executive Summary
  2. Technical Report
  3. WCAG Compliance
  4. RPwD Legal
  5. SEBI Report (disabled + "Enterprise" badge + tooltip)
  6. Accessibility Statement
- [ ] Each type shows description
- [ ] Asset dropdown populates from org assets
- [ ] Scan dropdown appears after asset selected
- [ ] Scan options show date and score: "Scan from DD/MM/YYYY — Score: 85/100"
- [ ] Format radio buttons: PDF / HTML
- [ ] Optional date range: From/To date pickers
- [ ] "Generate Report" button:
  - Disabled until asset + scan selected
  - Shows loading state when clicked
  - Shows progress message: "Generating your {type} report... 30-60 seconds"
- [ ] Success state shows download link
- [ ] "Download Report" button works
- [ ] "Generate Another" button resets form

**Reports List:**

- [ ] Table displays: Name, Type, Asset, Scan Date, Generated, Format, Actions
- [ ] Type badges show correct label
- [ ] Format badges show PDF or HTML icon
- [ ] Dates in DD/MM/YYYY format
- [ ] Download button has aria-label
- [ ] Delete button shows confirmation modal
- [ ] Empty state shows when no reports

**Accessibility:**

```bash
pnpm test:a11y src/components/dashboard/reports/
```

---

### C. Certificates

**URL:** http://localhost:3000/dashboard/certs

**Test Cases:**

**If No Qualified Assets:**

- [ ] Info alert shows: "No assets qualified for certification"
- [ ] Explanation text shows requirements: score ≥ 80, zero critical issues

**If Qualified Assets Exist:**

**Issue Certificate Panel:**

- [ ] Asset dropdown shows only qualified assets
- [ ] Scan dropdown filters to scans with score ≥ 80
- [ ] Warning shows if selected scan score < 80
- [ ] Three certification level radio buttons:
  - WCAG 2.2 AA
  - IS 17802 (Indian Standard)
  - RPwD Act 2016 Compliant
- [ ] Notes textarea (optional)
- [ ] Auditor sign-off checkbox (required) with bold warning text
- [ ] "Issue Certificate" button:
  - Disabled until checkbox checked
  - Shows loading state
  - Success navigates to certificates list

**Certificates List:**

- [ ] Cards display in grid (responsive: 1 col mobile, 2 tablet, 3 desktop)
- [ ] Each card shows:
  - Badge preview (gradient circle with Award icon)
  - Asset name and URL
  - Level badge (WCAG 2.2 AA / IS 17802 / RPwD)
  - Status badge: Valid / Expired / Revoked (icon + color + text)
  - Score at issuance
  - Issued date (DD/MM/YYYY)
  - Expires date (DD/MM/YYYY)
- [ ] Expiry warning (< 30 days): orange alert with "Expires in X days"
- [ ] Revoked certificates show reason
- [ ] Action buttons:
  - "Copy embed code" → opens modal
  - "View public page" → opens /verify/{token} in new tab
  - "Revoke" → opens confirmation modal

**Badge Embed Code Modal:**

- [ ] Three variant buttons: Round (120×120), Horizontal (240×80), Compact (160×60)
- [ ] Visual preview updates when variant selected
- [ ] Badge preview shows gradient
- [ ] Embed code displays in monospace
- [ ] Copy button works
- [ ] Code includes:
  - Proper `<a>` wrapper with aria-label
  - `<img>` with meaningful alt text
  - Correct width/height
  - Link to verification page
- [ ] Info note explains badge auto-updates

**Revoke Modal:**

- [ ] Reason textarea (required)
- [ ] Cancel button closes modal
- [ ] "Revoke Certificate" button:
  - Disabled until reason entered
  - Shows loading state
  - Success updates certificate status

**Keyboard & Accessibility:**

- [ ] Tab order: form fields → buttons → card actions
- [ ] aria-label on each certificate card
- [ ] Focus trap in modals
- [ ] Escape closes modals

---

### D. Settings Hub

**URL:** http://localhost:3000/dashboard/settings

**Overall Layout:**

- [ ] Six tabs visible: Organisation, Team & Roles, Integrations, Billing, Notifications, Widget
- [ ] Each tab has icon + label
- [ ] Arrow keys navigate tabs
- [ ] Tab panels change with keyboard navigation
- [ ] Active tab has aria-selected="true"

#### Tab 1: Organisation

**Test Cases:**

- [ ] Organisation name field pre-filled
- [ ] Industry dropdown works
- [ ] GSTIN field accepts pattern: 22AAAAA0000A1Z5
- [ ] Billing email field (required, type=email)
- [ ] Billing name text input
- [ ] Billing address textarea
- [ ] "Save changes" button works
- [ ] Success toast on save

**Danger Zone:**

- [ ] Red border section visible
- [ ] Warning text clear about data deletion
- [ ] "Delete organisation" button opens modal
- [ ] Modal requires typing org name to confirm
- [ ] Delete button disabled until name matches
- [ ] Cancel button closes modal

#### Tab 2: Team & Roles

**Test Cases:**

- [ ] "Invite user" button opens modal
- [ ] Team members table displays:
  - Avatar (first letter of name/email)
  - Name (or "N/A")
  - Email
  - Role badge
  - Status badge: Active / Pending / Inactive
  - Joined date (DD/MM/YYYY)
  - More actions button

**Invite Modal:**

- [ ] Email field (required, type=email)
- [ ] Full Name field (optional)
- [ ] Role dropdown with options:
  - Customer Admin
  - Accessibility Officer
  - Developer
  - Auditor
- [ ] Cancel button
- [ ] "Send invite" button with Mail icon
- [ ] Success closes modal and refreshes table

#### Tab 3: Integrations (Jira)

**Test Cases:**

**If Not Connected:**

- [ ] Jira logo/icon displays
- [ ] Description explains integration
- [ ] Three checkmarks list features:
  - Automatic issue syncing
  - Severity mapped to priority
  - Bi-directional status updates
- [ ] "Connect to Jira Cloud" button opens OAuth popup

**OAuth Flow:**

- [ ] Click "Connect to Jira Cloud"
- [ ] Popup window opens (600×700)
- [ ] Redirects to Atlassian auth
- [ ] After auth, popup closes automatically
- [ ] Parent window refreshes integration status

**If Connected:**

- [ ] Green checkmark icon
- [ ] "Jira Connected" heading with "Active" badge
- [ ] Instance URL displays
- [ ] Connected email displays
- [ ] Last synced timestamp (if available)
- [ ] Issues synced count
- [ ] "Disconnect" button (ghost, red)

**Field Mapping Section:**

- [ ] Four severity→priority dropdowns:
  - Critical → (Highest/High/Medium/Low/Lowest)
  - Serious →
  - Moderate →
  - Minor →
- [ ] WCAG Criterion custom field input
- [ ] Help text: "Custom field ID in Jira..."

**Sync Section:**

- [ ] "Sync all open issues" button
- [ ] Spinner shows while syncing
- [ ] Help text explains manual sync

**Disconnect Modal:**

- [ ] Warning text explains existing issues remain in Jira
- [ ] Cancel button
- [ ] "Disconnect" button (red)

**Integration Test:**

1. Connect Jira (requires real Jira Cloud account)
2. Go to Issue detail page
3. Click "Apply to Jira"
4. Verify issue created in Jira
5. Update status in Jira
6. Webhook should update AccessShield status (check database)

#### Tab 4: Billing

**Test Cases:**

**Current Plan Card:**

- [ ] Plan name displays: Starter / Professional / Enterprise / Government
- [ ] "Upgrade plan" button (if not Enterprise)
- [ ] "Manage billing" button links to Razorpay

**Usage Meters:**

- [ ] Assets meter:
  - Shows "X of Y" or "X of unlimited"
  - Progress bar visualized
  - aria-valuenow, aria-valuemin, aria-valuemax set
  - aria-valuetext describes usage
- [ ] Scans this month meter (same pattern)

**Invoices Table:**

- [ ] Columns: Invoice No., Date, Amount, GST, Status, Download
- [ ] Invoice numbers in monospace font
- [ ] Dates in DD/MM/YYYY format
- [ ] Amount in ₹ with Indian formatting: ₹3,999 (not ₹3999.00)
- [ ] GST amount displayed
- [ ] Status badges: Paid (green) / Sent (amber) / Overdue (red) / Draft (gray)
- [ ] Download button has aria-label
- [ ] Empty state if no invoices

**Test INR Formatting:**

```javascript
// Should format as ₹12,34,567 (lakhs/crores)
formatINR(123456700); // ₹12,34,567
formatINR(399900); // ₹3,999
formatINR(150000); // ₹1,500
```

#### Tab 5: Notifications

**Test Cases:**

**Email Notifications:**

- [ ] Six notification types with switches:
  1. Scan completed
  2. Critical violation detected
  3. Issue assigned to me
  4. Certificate issued
  5. Invoice generated
  6. Monthly compliance summary
- [ ] Each row: Switch + Label + Description
- [ ] Switches toggle on/off
- [ ] State persists on save

**WhatsApp Notifications:**

- [ ] Phone number input: placeholder "+91 98765 43210"
- [ ] Pattern validation for Indian numbers
- [ ] "Verify number" button shows if not verified
- [ ] OTP flow (requires real integration)
- [ ] After verification:
  - Three notification toggles show:
    - Scan completed (default off)
    - Critical violation detected (default on)
    - Issue assigned (default off)

**In-App Notifications:**

- [ ] Text explains all in-app enabled by default
- [ ] References notification bell in top bar

**Save Button:**

- [ ] "Save preferences" button at bottom
- [ ] Shows loading state
- [ ] Success toast on save

#### Tab 6: Widget

**Test Cases:**

**Widget Token:**

- [ ] Token displays in monospace (readonly)
- [ ] Copy button works
- [ ] "Regenerate" button opens warning modal
- [ ] Warning modal:
  - Explains old token breaks
  - Cancel button
  - "Regenerate Token" button (red)

**Allowed Domains:**

- [ ] Help text explains whitelist
- [ ] Input field to add domain
- [ ] "Add" button adds domain to list
- [ ] Enter key also adds domain
- [ ] Domains display as removable pills
- [ ] X button removes domain
- [ ] Empty state: "All domains allowed"

**Widget Appearance:**

- [ ] Position dropdown with 4 options:
  - Bottom Right (default)
  - Bottom Left
  - Top Right
  - Top Left
- [ ] Default Language dropdown:
  - English
  - Hindi (हिन्दी)
- [ ] Changes persist on save

**Embed Code:**

- [ ] Code displays in dark monospace
- [ ] Copy button works
- [ ] Includes:
  - `<script>` wrapper
  - CDN URL
  - `data-token` attribute
  - Appended to `<head>`
- [ ] Help text: "Paste in <head> section"

**Live Preview:**

- [ ] Iframe shows widget
- [ ] Widget position updates when changed
- [ ] Widget actually functional in preview

**Save Button:**

- [ ] "Save settings" button at bottom
- [ ] Shows loading state
- [ ] Success refreshes settings

---

## Manual Accessibility Testing

### Keyboard Navigation Test

```
Test every page:
1. Click in address bar (or refresh)
2. Press Tab continuously
3. Verify:
   ✓ Focus reaches every interactive element
   ✓ Focus order is logical (top to bottom, left to right)
   ✓ Focus indicator is visible (2px outline)
   ✓ No keyboard traps (can always Tab out)
   ✓ Escape closes modals
   ✓ Arrow keys work in Select/Tabs components
   ✓ Enter/Space activates buttons
```

### Screen Reader Test

```
macOS VoiceOver:
1. Enable: Cmd + F5
2. Navigate: VO + Arrow keys
3. Verify:
   ✓ All text is announced
   ✓ Form labels announced with inputs
   ✓ Button purposes are clear
   ✓ Images have meaningful alt text
   ✓ Status changes announced (aria-live)
   ✓ Loading states announced
   ✓ Error messages read when they appear
```

### Color Contrast Test

```
Browser DevTools:
1. Open DevTools → Rendering
2. Enable "Emulate vision deficiencies"
3. Test each:
   - Protanopia (red-blind)
   - Deuteranopia (green-blind)
   - Tritanopia (blue-blind)
   - Achromatopsia (no color)
4. Verify:
   ✓ All information still available without color
   ✓ Severity badges readable (icon + text visible)
   ✓ Status indicators readable
   ✓ Error states clear
```

### Touch Target Test

```
Mobile/Tablet:
1. Open DevTools → Toggle device toolbar
2. Set to iPhone/iPad
3. Verify:
   ✓ All buttons ≥ 44×44px
   ✓ Links in tables ≥ 44px tall
   ✓ Checkboxes ≥ 44px touch area
   ✓ No accidental taps
```

---

## Automated Accessibility Testing

### Run axe-core Tests

```bash
cd apps/web

# Test all Session B components
pnpm test:a11y src/components/dashboard/issues/
pnpm test:a11y src/components/dashboard/reports/
pnpm test:a11y src/components/dashboard/certs/
pnpm test:a11y src/components/dashboard/settings/

# Expected output: 0 violations for each component
```

### Run Lighthouse Audit

```bash
# Start dev server
pnpm dev

# In Chrome DevTools:
1. Open Lighthouse tab
2. Select "Accessibility" only
3. Run audit on:
   - /dashboard/issues
   - /dashboard/issues/[id]
   - /dashboard/reports
   - /dashboard/certs
   - /dashboard/settings

# Expected: 100 score on all pages
```

---

## Integration Testing

### Test Issue → Jira Flow (End-to-End)

```
Prerequisites:
- Jira Cloud account
- OAuth app registered
- Environment variables set

Steps:
1. Connect Jira in Settings → Integrations
2. Go to Issues → Select an issue
3. Click "Apply to Jira"
4. Verify:
   ✓ Issue created in Jira
   ✓ Summary correct
   ✓ Description has ADF formatting
   ✓ Priority mapped correctly
   ✓ Labels added: accessibility, wcag, {severity}
   ✓ Screenshot link works
   ✓ AccessShield link works
5. Update status in Jira (e.g., "In Progress")
6. Check AccessShield issue
7. Verify:
   ✓ Status synced (webhook received)
   ✓ Audit log created
```

### Test Report Generation

```
Prerequisites:
- At least one completed scan
- Asset exists

Steps:
1. Go to Reports
2. Click "Generate New Report"
3. Select:
   - Type: Technical Report
   - Asset: (any)
   - Scan: (completed scan with score)
   - Format: PDF
4. Click "Generate Report"
5. Wait for generation (30-60s)
6. Click "Download Report"
7. Verify:
   ✓ PDF downloads
   ✓ Contains scan results
   ✓ Formatted correctly
   ✓ Indian date format used
```

### Test Certificate Issuance

```
Prerequisites:
- Asset with scan score ≥ 80
- No critical violations

Steps:
1. Go to Certificates
2. Select asset and qualifying scan
3. Choose level: WCAG 2.2 AA
4. Check "I confirm..." checkbox
5. Click "Issue Certificate"
6. Verify:
   ✓ Certificate appears in list
   ✓ Status: Valid
   ✓ Expires 1 year from now
   ✓ Score displayed
7. Click "Copy embed code"
8. Select variant: Horizontal
9. Copy code
10. Paste in test HTML file
11. Verify:
    ✓ Badge displays
    ✓ Links to verification page
    ✓ Alt text meaningful
```

---

## Performance Testing

### Check Bundle Sizes

```bash
cd apps/web
pnpm build

# Check output:
# Should see bundle analysis
# Verify no single bundle > 244 KB (Vercel warning threshold)
```

### Lighthouse Performance

```
Run Lighthouse with "Performance" category
Target scores:
- Performance: 90+
- Accessibility: 100
- Best Practices: 95+
- SEO: 100
```

---

## Common Issues & Troubleshooting

### Issue: "Module not found: @ui/components/..."

**Solution:**

```bash
# Rebuild packages
pnpm --filter @accessshield/ui build
pnpm --filter @accessshield/db build
```

### Issue: TypeScript errors in IDE

**Solution:**

```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Keycloak auth not working

**Solution:**

1. Check `.env.local` has `AUTH_ISSUER_URL`, `KEYCLOAK_*`, `AUTH_SECRET`, `NEXTAUTH_URL`
2. Confirm Keycloak is up: `http://localhost:8080` and realm `accessshield`
3. Check Network tab for 401s on `/api/auth/*` or API Bearer calls

### Issue: Jira OAuth popup blocked

**Solution:**

1. Allow popups for localhost:3000
2. Or manually open auth URL in new tab

### Issue: API connection refused

**Solution:**

```bash
# Verify API is running
curl http://localhost:4000/health

# If not running:
cd apps/api
pnpm dev
```

---

## Quick Test Checklist

Run through this checklist to verify Session B works:

### Issues (15 min)

- [ ] List page loads
- [ ] Filters work
- [ ] Detail page loads
- [ ] AI fix shows (or polls)
- [ ] Status change works
- [ ] Comment posts

### Reports (5 min)

- [ ] Panel opens
- [ ] Form validates
- [ ] Generate starts (mock data OK)
- [ ] List displays

### Certificates (5 min)

- [ ] Form shows qualified assets only
- [ ] Issue works
- [ ] List displays
- [ ] Embed code copies

### Settings (10 min)

- [ ] All 6 tabs load
- [ ] Organisation form saves
- [ ] Jira shows connect flow
- [ ] Billing shows usage
- [ ] Notifications toggle
- [ ] Widget shows token

### Accessibility (10 min)

- [ ] Tab through all pages
- [ ] No keyboard traps
- [ ] Focus visible everywhere
- [ ] Run axe-core: 0 violations

---

## Reporting Bugs

If you find issues:

1. **Check Browser Console** for JavaScript errors
2. **Check Network Tab** for failed API calls
3. **Check Terminal** for server errors
4. **Document:**
   - URL where issue occurs
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser + version
   - Screenshot if visual issue

---

## Next Steps After Testing

Once Session B tests pass:

1. **Backend API Implementation** - All endpoints currently return mock data
2. **Database Migrations** - Create tables for issues, reports, certificates, etc.
3. **AI Service Integration** - Connect real Anthropic API
4. **Email/WhatsApp** - Wire up notification providers
5. **E2E Tests** - Playwright tests for critical flows
6. **Production Deploy** - Vercel (web) + AWS (API)

---

**Session B Testing: Complete ✓**

For questions or issues, check:

- `SESSION_B_SUMMARY.md` - Technical details
- `.cursorrules` - Accessibility standards
- Component source code - Inline comments
