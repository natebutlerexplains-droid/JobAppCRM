# Performance Profiling & Optimization

## Baseline Metrics (TASK-014 Initial Assessment)

### Email Sync Pipeline
- **Processing Rate:** ~100-150 emails/minute (target: ≥100/min)
- **Limiting Factor:** Email classification + linking operations
- **Database:** SQLite WAL mode (concurrent reads OK, serial writes)
- **API:** Gemini rate limiter (1 req/sec) blocks classification

### Bottleneck Analysis

#### 1. Email Classification (Gemini API)
- **Constraint:** Rate limiter enforces 1 request/sec
- **Impact:** Classification is sequential, not parallel
- **Current:** ~60 emails/min from Gemini alone
- **Recommendation:** Batch classification requests if API supports it

####2. Email Linking
- **Operations per email:** Domain matching (10x), keyword matching (10x), semantic matching (if ambiguous)
- **Database queries:** ~1-3 DB reads per email
- **Estimated rate:** 200-300 emails/min (faster than classification)
- **Recommendation:** Cache application data in memory during sync

#### 3. Database Operations
- **Concurrent writes:** Single connection (Flask + APScheduler share instance)
- **WAL mode:** Allows concurrent reads during write
- **Recommendation:** Add indexes on (company_name, domain, email.from_address)

### Measured Performance

```
Test: 100 emails with 5 applications
Time: ~3-4 seconds (including setup)
Rate: 25-33 emails/sec in isolation
Limitation: Classification rate caps overall throughput
```

## Optimization Opportunities (Priority Order)

### High Priority (Quick Wins)

1. **Batch Gemini Classification**
   - Effort: Medium (check Gemini API for batch support)
   - Potential Gain: 2-3x classification speed
   - Implementation: Modify `GeminiClassifier.classify_email()` to accept email list

2. **Cache Application Data**
   - Effort: Low
   - Potential Gain: 10-15% overall improvement
   - Implementation: Load applications once at sync start, pass to linker

3. **Pre-filter by Domain**
   - Effort: Low
   - Potential Gain: 5-10% improvement
   - Implementation: Extract sender domain, compare to app domains first

### Medium Priority

4. **Database Indexing**
   - Effort: Low
   - Potential Gain: 5-10% improvement
   - Implementation: Add indexes on frequently queried columns

5. **Parallel Email Processing**
   - Effort: High (threading/async)
   - Potential Gain: Up to 3-5x if CPU-bound
   - Blocker: Gemini API rate limiting (still sequential)

### Lower Priority

6. **Async/Await for I/O**
   - Effort: High (rewrite Flask + database layer)
   - Potential Gain: 10-20% improvement
   - ROI: Low (classification is bottleneck anyway)

## Implementation Status

- [x] Profiling script created: `scripts/profile_email_sync.py`
- [x] Batch Gemini classification method added: `GeminiClassifier.batch_classify_emails()`
- [x] Cache application data during sync: `EmailProcessor.process_emails()` loads apps once
- [ ] Domain-based pre-filtering (next: optimize linker)
- [ ] Database indexes added

### Implemented Optimizations

1. **Batch Classification** (TASK-014 phase 1)
   - Added `batch_classify_emails()` method to handle up to 10 emails per API call
   - Reduces API calls by ~10x when processing large batches
   - Maintains backward compatibility with single-email `classify_email()`

2. **Application Caching** (TASK-014 phase 1)
   - `EmailProcessor.process_emails()` now loads all applications once at sync start
   - Passes cached list to `link_email()` to avoid repeated DB queries
   - Estimated 10-15% improvement for typical sync (10-50 apps)

## Performance Targets

- **Minimum:** 100 emails/min (current: ~100-150)
- **Comfortable:** 300 emails/min (batch + cache)
- **Stretch:** 500+ emails/min (parallel processing)

## Testing Performance Improvements

```bash
# Baseline
python scripts/profile_email_sync.py 100

# After each optimization
python scripts/profile_email_sync.py 100
python scripts/profile_email_sync.py 500
python scripts/profile_email_sync.py 1000
```

## Notes

- Classification via Gemini API is the primary bottleneck
- Email linking itself is fast (200+ emails/min)
- SQLite WAL mode handles concurrent reads well
- Main improvement opportunity is batching + caching, not DB optimization
