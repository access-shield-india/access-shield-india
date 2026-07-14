"""Unit tests for DLP (Data Loss Prevention) module."""

import pytest
from utils.dlp import scrub, scrub_dict, truncate


class TestScrubAadhaar:
    """Tests for Aadhaar number scrubbing."""

    def test_scrubs_aadhaar_spaced(self):
        """Aadhaar with spaces: 1234 5678 9012 → [REDACTED-AADHAAR]"""
        text = "My Aadhaar is 1234 5678 9012 for verification."
        result = scrub(text)
        assert "1234 5678 9012" not in result
        assert "[REDACTED-AADHAAR]" in result

    def test_scrubs_aadhaar_continuous(self):
        """Aadhaar continuous: 123456789012 → [REDACTED-AADHAAR]"""
        text = "Aadhaar: 123456789012"
        result = scrub(text)
        assert "123456789012" not in result
        assert "[REDACTED-AADHAAR]" in result

    def test_scrubs_multiple_aadhaar(self):
        """Multiple Aadhaar numbers in same text."""
        text = "User A: 1234 5678 9012, User B: 987654321098"
        result = scrub(text)
        assert "1234 5678 9012" not in result
        assert "987654321098" not in result
        assert result.count("[REDACTED-AADHAAR]") == 2


class TestScrubPAN:
    """Tests for PAN card number scrubbing."""

    def test_scrubs_pan(self):
        """PAN: ABCDE1234F → [REDACTED-PAN]"""
        text = "My PAN is ABCDE1234F"
        result = scrub(text)
        assert "ABCDE1234F" not in result
        assert "[REDACTED-PAN]" in result

    def test_preserves_non_pan_pattern(self):
        """Text that looks like PAN but isn't valid."""
        text = "Code ABCDE12345 is not a PAN"  # 5 digits, not 4
        result = scrub(text)
        assert "ABCDE12345" in result  # Should not be scrubbed


class TestScrubPhone:
    """Tests for Indian phone number scrubbing."""

    def test_scrubs_phone_with_plus91(self):
        """Phone with +91: +919876543210 → [REDACTED-PHONE]"""
        text = "Call me at +919876543210"
        result = scrub(text)
        assert "+919876543210" not in result
        assert "[REDACTED-PHONE]" in result

    def test_scrubs_phone_with_91(self):
        """Phone with 91: 919876543210 → [REDACTED-PHONE]"""
        text = "Number: 919876543210"
        result = scrub(text)
        assert "919876543210" not in result
        assert "[REDACTED-PHONE]" in result

    def test_scrubs_phone_with_zero(self):
        """Phone with 0: 09876543210 → [REDACTED-PHONE]"""
        text = "Contact: 09876543210"
        result = scrub(text)
        assert "09876543210" not in result
        assert "[REDACTED-PHONE]" in result

    def test_scrubs_phone_plain(self):
        """Plain 10-digit phone: 9876543210 → [REDACTED-PHONE]"""
        text = "User 9876543210 reported this."
        result = scrub(text)
        assert "9876543210" not in result
        assert "[REDACTED-PHONE]" in result

    def test_preserves_invalid_phone(self):
        """Numbers starting with 0-5 are not Indian mobile."""
        text = "Code 1234567890 is not a phone"
        result = scrub(text)
        # This might be caught by ACCOUNT pattern, but not PHONE
        assert "[REDACTED-PHONE]" not in result


class TestScrubEmail:
    """Tests for email address scrubbing."""

    def test_scrubs_email(self):
        """Email: user@example.com → [REDACTED-EMAIL]"""
        text = "Contact user@example.com for help"
        result = scrub(text)
        assert "user@example.com" not in result
        assert "[REDACTED-EMAIL]" in result

    def test_scrubs_email_with_dots(self):
        """Email with dots in local part."""
        text = "Email: first.last@company.co.in"
        result = scrub(text)
        assert "first.last@company.co.in" not in result
        assert "[REDACTED-EMAIL]" in result

    def test_scrubs_email_with_plus(self):
        """Email with plus sign."""
        text = "user+tag@gmail.com"
        result = scrub(text)
        assert "user+tag@gmail.com" not in result
        assert "[REDACTED-EMAIL]" in result


class TestScrubCard:
    """Tests for credit/debit card number scrubbing."""

    def test_scrubs_card_with_spaces(self):
        """Card with spaces: 1234 5678 9012 3456"""
        text = "Card: 1234 5678 9012 3456"
        result = scrub(text)
        assert "1234 5678 9012 3456" not in result
        assert "[REDACTED-CARD]" in result

    def test_scrubs_card_with_dashes(self):
        """Card with dashes: 1234-5678-9012-3456"""
        text = "Card: 1234-5678-9012-3456"
        result = scrub(text)
        assert "1234-5678-9012-3456" not in result
        assert "[REDACTED-CARD]" in result

    def test_scrubs_card_continuous(self):
        """Card continuous: 1234567890123456"""
        text = "Card: 1234567890123456"
        result = scrub(text)
        assert "1234567890123456" not in result
        assert "[REDACTED-CARD]" in result


class TestScrubIFSC:
    """Tests for IFSC code scrubbing."""

    def test_scrubs_ifsc(self):
        """IFSC: SBIN0001234 → [REDACTED-IFSC]"""
        text = "IFSC code: SBIN0001234"
        result = scrub(text)
        assert "SBIN0001234" not in result
        assert "[REDACTED-IFSC]" in result

    def test_scrubs_ifsc_various_banks(self):
        """Various bank IFSC codes."""
        text = "HDFC0001234 ICIC0002345 UTIB0003456"
        result = scrub(text)
        assert "[REDACTED-IFSC]" in result
        assert "HDFC0001234" not in result


class TestPreservesNormalText:
    """Tests that normal text is preserved."""

    def test_preserves_normal_text(self):
        """Normal text should remain unchanged."""
        text = "This is a button without alt text"
        result = scrub(text)
        assert result == text

    def test_preserves_accessibility_content(self):
        """Accessibility-related content should remain."""
        text = "Missing alt attribute on img element. WCAG 1.1.1 violation."
        result = scrub(text)
        assert result == text

    def test_preserves_html(self):
        """HTML snippets should remain (except PII in attributes)."""
        text = '<button aria-label="Submit form">Submit</button>'
        result = scrub(text)
        assert result == text


class TestScrubMixed:
    """Tests for mixed content with multiple PII types."""

    def test_scrubs_mixed(self):
        """Text containing aadhaar + email → both redacted."""
        text = "User 1234 5678 9012 email: test@example.com reported issue"
        result = scrub(text)
        assert "1234 5678 9012" not in result
        assert "test@example.com" not in result
        assert "[REDACTED-AADHAAR]" in result
        assert "[REDACTED-EMAIL]" in result

    def test_scrubs_all_types(self):
        """Text with all PII types."""
        text = (
            "Contact: 9876543210, Email: user@test.com, "
            "Aadhaar: 1234 5678 9012, PAN: ABCDE1234F, "
            "Card: 1234-5678-9012-3456, IFSC: SBIN0001234"
        )
        result = scrub(text)
        assert "[REDACTED-PHONE]" in result
        assert "[REDACTED-EMAIL]" in result
        assert "[REDACTED-AADHAAR]" in result
        assert "[REDACTED-PAN]" in result
        assert "[REDACTED-CARD]" in result
        assert "[REDACTED-IFSC]" in result


class TestTruncate:
    """Tests for text truncation."""

    def test_truncate_long_text(self):
        """String of 5000 chars → 3000 chars + '...[truncated]'"""
        text = "a" * 5000
        result = truncate(text, 3000)
        assert len(result) == 3000 + len("...[truncated]")
        assert result.endswith("...[truncated]")

    def test_truncate_short_text(self):
        """String of 100 chars → unchanged."""
        text = "a" * 100
        result = truncate(text, 3000)
        assert result == text
        assert len(result) == 100

    def test_truncate_exact_limit(self):
        """String exactly at limit → unchanged."""
        text = "a" * 3000
        result = truncate(text, 3000)
        assert result == text

    def test_truncate_empty(self):
        """Empty string → empty string."""
        result = truncate("", 3000)
        assert result == ""

    def test_truncate_custom_limit(self):
        """Custom truncation limit."""
        text = "a" * 500
        result = truncate(text, 100)
        assert len(result) == 100 + len("...[truncated]")


class TestScrubDict:
    """Tests for recursive dictionary scrubbing."""

    def test_scrubs_simple_dict(self):
        """Simple dict with PII values."""
        data = {"phone": "9876543210", "name": "Test User"}
        result = scrub_dict(data)
        assert "[REDACTED-PHONE]" in result["phone"]
        assert result["name"] == "Test User"

    def test_scrubs_nested_dict(self):
        """Nested dict with PII."""
        data = {
            "user": {
                "email": "user@example.com",
                "phone": "9876543210",
            }
        }
        result = scrub_dict(data)
        assert "[REDACTED-EMAIL]" in result["user"]["email"]
        assert "[REDACTED-PHONE]" in result["user"]["phone"]

    def test_scrubs_list_in_dict(self):
        """Dict with list containing PII."""
        data = {"emails": ["one@test.com", "two@test.com"]}
        result = scrub_dict(data)
        assert all("[REDACTED-EMAIL]" in e for e in result["emails"])

    def test_preserves_non_string_values(self):
        """Non-string values should remain unchanged."""
        data = {"count": 42, "enabled": True, "items": None}
        result = scrub_dict(data)
        assert result["count"] == 42
        assert result["enabled"] is True
        assert result["items"] is None

    def test_does_not_mutate_input(self):
        """Original dict should not be modified."""
        original = {"email": "user@example.com"}
        _ = scrub_dict(original)
        assert original["email"] == "user@example.com"
