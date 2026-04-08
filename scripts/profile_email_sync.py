#!/usr/bin/env python3
"""
Performance profiling script for email sync pipeline.
Measures email linking speed with synthetic data.
Usage: cd backend && python ../scripts/profile_email_sync.py [num_emails]
"""

import time
import sys
import os
import tempfile

# Import from backend (run from backend directory)
from models import Database, Application, Email
from application_linker import link_email_to_application

def profile_sync(num_emails=100):
    """Profile email linking pipeline."""
    print(f"\n{'=' * 60}")
    print(f"Email Sync Performance Profile")
    print(f"{'=' * 60}\n")

    # Setup test database
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, 'test.db')
        db = Database(db_path)

        print(f"Profiling {num_emails} emails...\n")

        # Create test applications
        start = time.time()
        companies = ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta']
        for i in range(10):
            app = Application(
                company_name=companies[i % len(companies)],
                job_title=f'Software Engineer {i}',
                job_description=f'Test job {i}',
                status='submitted',
                date_submitted='2026-04-08'
            )
            app.save(db)
        apps = Application.get_all(db)
        setup_time = time.time() - start

        # Create test emails
        emails_list = []
        subjects = ['Your application received', 'Interview scheduled', 'Job offer', 'Application status update']
        for i in range(num_emails):
            email = Email(
                subject=subjects[i % len(subjects)],
                from_address=f'recruiter{i % 5}@company.com',
                content=f'Email body {i}',
                received_at='2026-04-08T10:00:00Z'
            )
            emails_list.append(email)

        print(f"Setup: {setup_time:.3f}s")
        print(f"Test data: {len(apps)} applications, {num_emails} emails\n")

        # Profile linking
        print(f"--- Linking Performance ---")
        link_start = time.time()
        linked = 0
        errors = 0

        for i, email in enumerate(emails_list):
            try:
                # Time the linking operation
                match = link_email_to_application(email, apps)
                linked += 1

                if (i + 1) % max(1, num_emails // 10) == 0:
                    elapsed = time.time() - link_start
                    rate = (i + 1) / elapsed if elapsed > 0 else 0
                    print(f"  {i + 1}/{num_emails} emails processed ({rate:.1f} emails/sec)")
            except Exception as e:
                errors += 1
                if errors == 1:  # Print first error only
                    print(f"  Error linking email {i}: {e}")

        link_time = time.time() - link_start
        link_rate = linked / link_time if link_time > 0 else 0

        # Summary
        print(f"\n--- Results ---")
        print(f"Emails processed: {linked}/{num_emails}")
        print(f"Time: {link_time:.3f}s")
        print(f"Rate: {link_rate:.1f} emails/sec ({link_rate * 60:.1f} emails/min)")
        print(f"Errors: {errors}")
        print(f"\nTarget: 100 emails/min ({100/60:.2f} emails/sec)")
        status = "✓ PASS" if link_rate * 60 >= 100 else "✗ FAIL"
        print(f"Status: {status}")

        print(f"\n--- Bottleneck Analysis ---")
        print(f"Linking uses semantic matching + DB queries")
        print(f"Current rate: {link_rate*60:.1f} emails/min")
        if link_rate * 60 < 100:
            print(f"Gap: {100 - link_rate*60:.1f} emails/min slower than target")
            print(f"Recommendations:")
            print(f"  - Cache application data in memory (reduce DB queries)")
            print(f"  - Implement domain-based pre-filtering")
            print(f"  - Use batch semantic matching if API supports it")

if __name__ == '__main__':
    num_emails = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    profile_sync(num_emails)
