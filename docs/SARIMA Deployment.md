# SARIMA deployment

Phase 7 targets **option A: Laravel and Python together on a VPS**. This keeps live uploads in the existing application. No hosting account has been purchased or production server deployed. If the eventual host cannot run Python subprocesses, a separate authenticated Python API is a future architecture change; it is not implemented here.

## Runtime and installation

Use the existing Laravel/PHP/PostgreSQL deployment, with `proc_open` enabled, plus Python 3.12 or 3.13 and a virtual environment. The pinned NumPy and SciPy packages require Python 3.12 or newer; this workspace was tested with Python 3.13 on Windows. Linux setup still needs verification on the target server.

Run from the application directory, replacing `/var/www/agrifarm` with the actual release path:

```bash
python3.13 -m venv python/.venv
python/.venv/bin/python -m pip install -r python/requirements.txt
python/.venv/bin/python -m pip check
python/.venv/bin/python -m unittest discover -s python/tests -v
php artisan migrate --force
```

Create the environment on the server rather than copying the Windows `.venv`. Environments have platform-specific interpreter paths and should be recreated at their destination. [Python venv documentation](https://docs.python.org/3/library/venv.html)

Set the server's private `.env`:

```dotenv
FORECAST_PYTHON_BIN=/var/www/agrifarm/python/.venv/bin/python
FORECAST_TIMEOUT=180
FORECAST_TUNING_SECONDS=30
```

An empty `FORECAST_PYTHON_BIN` uses `python/.venv/bin/python` on Linux or `python/.venv/Scripts/python.exe` on Windows. Laravel starts Python directly using an argument array; it does not call the batch file or `shell_exec`. The optional Windows batch helper resolves its script and interpreter relative to itself and accepts `FORECAST_PYTHON_BIN`.

Deploy the three reference JSON files in `storage/app/forecasting`, the Python scripts, requirements, and sample CSVs along with the Laravel release. The application account needs read/execute access to Python and read access to references; Laravel needs its normal write access to storage. Uploaded files use UUID names under the private local disk's `forecasting_temp` directory and are removed in `finally`. The raw uploads are not retained; `forecast_runs` stores result JSON, source filename and seller ownership. `planting_plans` stores each seller’s chosen crop and fixed planting/harvest months and growing time.

After configuring the environment:

```bash
php artisan config:cache
php artisan forecast:check
```

Run the check as the application service user as well as the deploy user. It exercises the PHP process runner with the one-year synthetic sample, cleans its temporary copy, and does not save a seller result. Then use an authenticated browser to upload both sample datasets through the real PHP-FPM application; CLI success alone does not verify the web process environment. Windows passes its discovered `SYSTEMROOT` explicitly to Python so system DLL loading also works through the PHP web process.

For local Windows development:

```powershell
python -m venv python/.venv
python/.venv/Scripts/python.exe -m pip install -r python/requirements.txt
php artisan migrate
php artisan forecast:check
```

## Admin-to-farmer harvest files

In Admin Reports, select From/To dates, choose one barangay in Export for forecasting, then Generate preview. A valid selection shows a report-style monthly table and Download Excel (the default format). Choose CSV to download the same data as a CSV. Downloads include every monthly row, including rows on other preview pages. Give that file to farmers; they upload it in Harvest Forecast and click Generate. No spreadsheet editing or synthetic sample data is required.

CSV and Excel have only `Month`, `Vegetable Crop`, `Harvest (kg)` and `Barangay`, with monthly totals from recorded kilogram quantities or measured total harvest weights. Excel uses the existing browser ExcelJS library after Laravel returns freshly validated aggregates; its first worksheet starts with the four headers and numeric kg values, without report titles or summary rows. Non-kg harvests need a farmer-entered Total harvest weight (kg), available in Record Harvest and Edit; their selling units stay separate. Missing weights, ambiguous case/spacing variants, unsafe/invalid names and importer limits block both downloads. Missing months are omitted, and partial first/last months are identified in the admin preview. Preview and download independently query and validate the records.

Each saved result's JSON retains the uploaded barangay and actual month coverage. Reference-only guidance remains labeled as seasonal guidance; dated kilogram ranges describe the barangay's recorded production. The uploaded name does not authenticate the file's issuer. Current attribution uses the seller's current barangay; no historical barangay snapshot or independent weighing approval is stored. Apply `2026_10_06_000002_add_measured_weight_to_harvest_records` to add the nullable weight field; existing records stay unweighed until a farmer records their actual weight.

A one-year file is accepted but uses illustrative seasonal references. SARIMA still requires at least 24 recorded months per crop, with existing gap and fit checks. See the [barangay harvest plan](SARIMA%20Barangay%20Harvest%20Data%20Plan.md) for the implementation and verification checklist.

## Request limits and capacity

Forecast uploads use their own named rate limiter. Harvest-record requests do not consume the upload allowance.

The endpoint allows five upload attempts per seller per minute. Files are limited to 5 MB, 20,000 rows, 50 uploaded crops, 100 characters per crop name, 0–1,000,000 kg per record, and a maximum 50-year record span. The first Excel worksheet is read, with a 64 MB uncompressed-workbook limit. Dates must be between 1900 and 2100. Missing records remain different from recorded zero harvests.

The 30-second tuning budget is shared across crops and only covers additional order search. Default fits and startup take extra time; the outer Laravel process timeout is 180 seconds. Requests still run synchronously, so multiple sellers can occupy multiple PHP workers. Size the VPS from measured simultaneous four-year uploads and leave capacity for checkout and other application requests. A queue is the next step if expected traffic makes synchronous execution unsuitable.

For a PHP-FPM/Nginx deployment, use request limits above the outer process timeout. Example values to adapt to the server:

```ini
; PHP configuration used by PHP-FPM
upload_max_filesize = 5M
post_max_size = 8M
max_execution_time = 240
; PHP-FPM pool configuration
request_terminate_timeout = 240s
```

```nginx
# Add within the existing Laravel server / PHP location configuration.
client_max_body_size 8m;
# Within the location forwarding index.php to PHP-FPM:
fastcgi_read_timeout 240s;
```

PHP-FPM's `request_terminate_timeout` can terminate an overlong request. Nginx's `fastcgi_read_timeout` measures the interval between reads from the upstream, which matters while Python produces its final JSON. Keep both greater than `FORECAST_TIMEOUT`. [PHP-FPM configuration](https://www.php.net/manual/en/install.fpm.configuration.php), [Nginx FastCGI configuration](https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html#fastcgi_read_timeout)

## Release verification

1. Back up the application database and run the `forecast_runs`, `planting_plans` and measured harvest weight migrations without development seeders.
2. Verify dependencies and `forecast:check` under the PHP service account.
3. Upload a one-year CSV: reference labels and percentages appear; the kg view explicitly says no estimate.
4. Upload the four-year CSV: dated kg estimates and prediction ranges appear; refresh and sign in again to verify persistence.
5. Upload an Excel workbook and malformed dates; verify accepted dates and readable row errors.
6. Check a different seller cannot see the result; test mobile, Filipino, and dark mode.
7. Monitor runtime, memory and process failures with realistic concurrency. Confirm failures leave the previous saved result intact and temporary uploads are removed.
8. In Admin Reports, export a barangay's actual kilogram records and upload the resulting CSV as a seller. Confirm scope/coverage persist, short histories retain the seasonal note, mixed/blank barangays fail, non-kg records without measured weights block download, and customer/seller accounts cannot use admin export endpoints. Add a measured total weight through Edit and verify the next export uses that kg value while leaving selling quantity/unit and stock unchanged.

Synthetic testing verifies the pipeline, not real-world forecasting accuracy. See [evaluation results](SARIMA%20Evaluation%20Results.md) before making accuracy claims.
