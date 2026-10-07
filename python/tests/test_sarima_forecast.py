import json
from pathlib import Path
import sys
from io import StringIO, BytesIO
import subprocess
from datetime import datetime
from zipfile import ZipFile
import time
import unittest
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evaluate_sarima import metrics
from generate_synthetic import generate_dataset
from sarima_forecast import (
    generate_forecast, load_reference, monthly_series, order_candidates,
    prepare_series, select_forecast, parse_data, UploadError,
)


class ForecastTests(unittest.TestCase):
    def test_barangay_column_validates_all_rows_in_csv_and_excel(self):
        for barangays, code in [(['Rosario', 'Maybunga'], 'mixed_barangays'), (['Rosario', ''], 'invalid_barangay')]:
            records = pd.DataFrame({'Month': ['2025-01', '2025-02'], 'Crop': ['Pechay', 'Pechay'], 'Harvest': [5, 6], ' barangay ': barangays})
            workbook = BytesIO()
            records.to_excel(workbook, index=False)
            workbook.seek(0)
            workbook.name = 'records.xlsx'
            for upload in [StringIO(records.to_csv(index=False)), workbook]:
                with self.assertRaises(UploadError) as caught:
                    parse_data(upload)
                self.assertEqual(caught.exception.code, code)

    def test_short_barangay_export_retains_scope_coverage_gaps_and_real_zero(self):
        upload = StringIO('Month,Vegetable Crop,Harvest (kg),Barangay\n2025-01,Pechay,12.345,Rosario\n2025-03,Pechay,0,Rosario\n')
        result = generate_forecast(upload, tuning_seconds=0)
        self.assertEqual(result['dataset'], {'scope': 'barangay', 'barangay': 'Rosario', 'record_start_month': '2025-01', 'record_end_month': '2025-03'})
        self.assertEqual(result['forecast_months'][0], '2025-04')
        self.assertEqual(result['crops']['Pechay']['data_points_used'], 2)
        self.assertEqual(result['crops']['Pechay']['missing_months'], 1)
        self.assertEqual(result['crops']['Pechay']['unit'], 'season_strength')
        self.assertEqual(result['crops']['Kamatis']['status'], 'new_crop')

    def test_suitable_barangay_history_fits_without_losing_dataset_scope(self):
        records = self.records(periods=36)
        records['Barangay'] = 'Rosario'
        result = self.forecast(records)
        self.assertEqual(result['dataset']['scope'], 'barangay')
        self.assertEqual(result['crops']['Pechay']['status'], 'success')
        self.assertEqual(result['dataset']['record_end_month'], result['data_end_month'])

    def test_personal_upload_has_no_barangay_scope(self):
        result = self.forecast(self.records(periods=12))
        self.assertEqual(result['dataset']['scope'], 'personal')
        self.assertIsNone(result['dataset']['barangay'])

    def records(self, periods=48, crop='Pechay', end='2025-12-01'):
        dates = pd.date_range(end=end, periods=periods, freq='MS')
        values = np.tile([40, 45, 40, 30, 22, 18, 15, 15, 18, 26, 35, 40], 4)[-periods:]
        return pd.DataFrame({'Month': dates.strftime('%B %Y'), 'Vegetable Crop': crop,
                             'Harvest (kg)': values, 'Date': dates})

    def forecast(self, records):
        csv = StringIO(records.drop(columns=['Date'], errors='ignore').to_csv(index=False))
        return generate_forecast(csv, tuning_seconds=0)

    def test_missing_months_are_nan_and_recorded_zero_is_kept(self):
        records = self.records()
        records.loc[3, 'Harvest (kg)'] = 0
        ts = monthly_series(records.drop(index=2))
        self.assertTrue(pd.isna(ts.iloc[2]))
        self.assertEqual(ts.iloc[3], 0)

    def test_short_gaps_are_interpolated_without_changing_real_zero(self):
        ts = monthly_series(self.records().drop(index=[2, 3, 20]))
        ts.iloc[8] = 0
        prepared, reason = prepare_series(ts)
        self.assertIsNone(reason)
        self.assertFalse(prepared.isna().any())
        self.assertEqual(prepared.iloc[8], 0)
        self.assertGreater(prepared.iloc[2], 0)

    def test_long_and_trailing_gaps_are_not_partially_filled(self):
        for missing in ([2, 3, 4], [47]):
            records = self.records().drop(index=missing)
            prepared, reason = prepare_series(monthly_series(records, pd.Timestamp('2025-12-01')))
            self.assertIsNone(prepared)
            self.assertEqual(reason, 'Unfilled Missing Months')

    def test_threshold_counts_observed_months_not_calendar_span(self):
        ts = monthly_series(self.records(periods=24).drop(index=3))
        self.assertEqual(prepare_series(ts)[1], 'Insufficient Data')

    def test_over_twenty_percent_missing_uses_profile(self):
        records = self.records().drop(index=list(range(1, 23, 2)))
        prepared, reason = prepare_series(monthly_series(records))
        self.assertIsNone(prepared)
        self.assertEqual(reason, 'Too Many Missing Months')

    def test_profile_dates_start_after_june_and_are_rotated(self):
        result = self.forecast(self.records(periods=12, end='2025-06-01'))
        row = result['crops']['Pechay']
        self.assertEqual(result['forecast_months'][0], '2025-07')
        self.assertEqual(result['forecast_months'][-1], '2026-06')
        self.assertEqual(row['profile_index'][0], load_reference('seasonal_profiles.json')['Pechay'][6])
        self.assertEqual(row['forecast'][0]['month'], '2025-07')
        self.assertIsNone(row['forecast'][0]['lower'])

    def test_new_crops_are_included_but_do_not_have_invented_kg(self):
        result = self.forecast(self.records(periods=12))
        self.assertEqual(len(result['crops']), 20)
        self.assertEqual(result['crops']['Kamatis']['status'], 'new_crop')
        self.assertEqual(result['crops']['Kamatis']['unit'], 'season_strength')

    def test_unknown_crop_is_unavailable_instead_of_zero_profile(self):
        result = self.forecast(self.records(periods=12, crop='Unknown vegetable'))
        row = result['crops']['Unknown vegetable']
        self.assertEqual(row['unit'], 'unavailable')
        self.assertEqual(row['forecast'], [])

    def test_fitted_forecast_has_dates_and_ordered_nonnegative_intervals(self):
        result = self.forecast(self.records())
        row = result['crops']['Pechay']
        self.assertEqual(row['status'], 'success')
        self.assertEqual(row['data_points_used'], 48)
        self.assertEqual(row['forecast'][0]['month'], '2026-01')
        self.assertEqual(len(row['forecast']), 12)
        self.assertEqual(row['interval_level'], 0.8)
        for point in row['forecast']:
            self.assertGreaterEqual(point['lower'], 0)
            self.assertLessEqual(point['lower'], point['value'])
            self.assertLessEqual(point['value'], point['upper'])
        json.dumps(result, allow_nan=False)

    def test_three_deleted_rows_use_observed_count_and_interpolation(self):
        result = self.forecast(self.records().drop(index=[3, 18, 35]))
        row = result['crops']['Pechay']
        self.assertEqual(row['status'], 'success')
        self.assertEqual(row['data_points_used'], 45)
        self.assertEqual(row['interpolated_months'], 3)
        self.assertEqual(len(row['forecast']), 12)

    def test_complete_grid_selects_lowest_aic_and_exposes_selected_orders(self):
        context = MagicMock()
        default = {'aic': 20, 'order': [1, 1, 1], 'seasonal_order': [1, 0, 0, 12]}
        chosen = {'aic': 5, 'order': [0, 0, 1], 'seasonal_order': [0, 1, 0, 12]}
        context.Queue.return_value.get.side_effect = [chosen, {**chosen, 'aic': 15}, {'complete': True}]
        with patch('sarima_forecast.mp.get_context', return_value=context), patch('sarima_forecast.fit_candidate', return_value=default):
            result = select_forecast(monthly_series(self.records()), time.monotonic() + 10)
        self.assertEqual(result['selection'], 'aic_grid')
        self.assertEqual(result['aic'], 5)
        self.assertEqual(result['order'], [0, 0, 1])
        self.assertEqual(result['candidates_fitted'], 3)

    def test_all_rows_share_dates_when_one_crop_stops_recording_early(self):
        records = pd.concat([self.records(), self.records(periods=12, crop='Kamatis', end='2024-12-01')])
        result = self.forecast(records)
        row = result['crops']['Kamatis']
        self.assertEqual(row['forecast'][0]['month'], '2026-01')
        self.assertEqual(row['missing_months'], 12)
        self.assertEqual(row['status'], 'fallback')

    def test_invalid_headers_and_negative_values_raise_clear_errors(self):
        with self.assertRaisesRegex(ValueError, 'Missing required columns'):
            self.forecast(pd.DataFrame({'wrong': [1]}))
        records = self.records(periods=12)
        records.loc[0, 'Harvest (kg)'] = -1
        with self.assertRaisesRegex(ValueError, 'non-negative'):
            self.forecast(records)

    def test_grid_has_64_distinct_orders_and_includes_default(self):
        self.assertEqual(len(set(order_candidates())), 64)
        self.assertIn(((1, 1, 1), (1, 0, 0, 12)), order_candidates())

    def test_all_supported_dates_and_case_insensitive_aliases(self):
        csv = StringIO(' month ,CROP,Kg\nJanuary 2025,Pechay,0\nJan 2025,Pechay,2\n2025-01,Pechay,3\n2025-01-15,Pechay,4\n')
        records = parse_data(csv)
        self.assertEqual(records['Date'].nunique(), 1)
        self.assertEqual(records['Date'].iloc[0], pd.Timestamp('2025-01-01'))
        self.assertEqual(monthly_series(records).iloc[0], 9)

    def test_excel_dates_and_text_dates_have_the_same_contract_as_csv(self):
        records = self.records(periods=12).drop(columns='Date').astype({'Month': object})
        records.loc[0, 'Month'] = datetime(2025, 1, 15)
        workbook = BytesIO()
        workbook.name = 'harvest.xlsx'
        records.to_excel(workbook, index=False, engine='openpyxl')
        workbook.seek(0)
        result = generate_forecast(workbook, tuning_seconds=0)
        self.assertEqual(result['schema_version'], 2)
        self.assertEqual(result['data_end_month'], '2025-12')
        self.assertEqual(result['crops']['Pechay']['status'], 'fallback')
        self.assertEqual(result['forecast_months'][0], '2026-01')

    def test_invalid_dates_report_specific_spreadsheet_row_numbers(self):
        records = self.records(periods=12)
        records.loc[[3, 7], 'Month'] = 'not a month'
        with self.assertRaises(UploadError) as error:
            self.forecast(records)
        self.assertEqual(error.exception.code, 'invalid_dates')
        self.assertEqual(error.exception.details['rows'], [5, 9])

    def test_corrupt_excel_contents_return_a_readable_error(self):
        workbook = BytesIO()
        workbook.name = 'corrupt.xlsx'
        with ZipFile(workbook, 'w') as archive:
            archive.writestr('dummy.txt', 'This is not an Excel workbook.')
        workbook.seek(0)
        with self.assertRaises(UploadError) as error:
            parse_data(workbook)
        self.assertEqual(error.exception.code, 'unreadable_file')

    def test_nonfinite_negative_and_excessive_harvest_are_rejected(self):
        for value in (-1, float('inf'), float('nan'), 1000001):
            records = self.records(periods=12).astype({'Harvest (kg)': float})
            records.loc[0, 'Harvest (kg)'] = value
            with self.assertRaises(UploadError) as error:
                self.forecast(records)
            self.assertEqual(error.exception.code, 'invalid_harvest')
            self.assertEqual(error.exception.details['rows'], [2])

    def test_empty_files_and_missing_crop_names_are_rejected(self):
        with self.assertRaises(UploadError) as error:
            parse_data(StringIO('Month,Vegetable Crop,Harvest (kg)\n'))
        self.assertEqual(error.exception.code, 'no_crops')
        with self.assertRaises(UploadError) as error:
            parse_data(StringIO('Month,Crop,Harvest\nJan 2025,,12\n'))
        self.assertEqual(error.exception.code, 'invalid_crops')

    def test_row_and_crop_limits_prevent_unbounded_uploads(self):
        for csv, code in (
            ('Month,Crop,kg\n' + 'Jan 2025,Pechay,1\n' * 20001, 'too_many_rows'),
            ('Month,Crop,kg\n' + ''.join(f'Jan 2025,Crop {i},1\n' for i in range(51)), 'too_many_crops'),
            ('Month,Crop,kg\nJan 1900,Pechay,1\nJan 2025,Pechay,1\n', 'date_span'),
        ):
            with self.assertRaises(UploadError) as error:
                parse_data(StringIO(csv))
            self.assertEqual(error.exception.code, code)

    def test_ambiguous_duplicate_aliases_are_rejected(self):
        with self.assertRaises(UploadError) as error:
            parse_data(StringIO('Month,Crop,Harvest,kg\nJan 2025,Pechay,1,2\n'))
        self.assertEqual(error.exception.code, 'duplicate_columns')

    def test_cli_returns_a_single_structured_json_error(self):
        process = subprocess.run([sys.executable, str(Path(__file__).resolve().parents[1] / 'sarima_forecast.py'),
                                  str(Path(__file__).parent / 'does-not-exist.csv')], capture_output=True, text=True, timeout=15)
        self.assertEqual(process.returncode, 1)
        self.assertEqual(process.stderr, '')
        payload = json.loads(process.stdout)
        self.assertEqual(payload['error_code'], 'unreadable_file')
        self.assertEqual(payload['details'], {})

    def test_search_process_stops_at_short_deadline_and_uses_default(self):
        ts = monthly_series(self.records())
        start = time.monotonic()
        # Mock the parent default only; spawned search remains a real process.
        candidate = {'aic': 10, 'order': [1, 1, 1], 'seasonal_order': [1, 0, 0, 12]}
        with patch('sarima_forecast.fit_candidate', return_value=candidate):
            selected = select_forecast(ts, start + 0.1)
        self.assertEqual(selected['selection'], 'default_budget')
        self.assertLess(time.monotonic() - start, 3)

    def test_mape_excludes_zeros_while_wape_includes_their_error(self):
        result = metrics([0, 10], [5, 8])
        self.assertEqual(result['mape_months'], 1)
        self.assertEqual(result['mape'], 20)
        self.assertEqual(result['wape'], 70)
        self.assertIsNone(metrics([0, 0], [1, 1])['mape'])
        self.assertIsNone(metrics([0, 0], [1, 1])['wape'])

    def test_synthetic_data_is_reproducible_and_retains_zero_harvests(self):
        for scenario in ('clean', 'realistic'):
            a = generate_dataset(scenario, seed=42)
            pd.testing.assert_frame_equal(a, generate_dataset(scenario, seed=42))
            self.assertEqual(len(a), 960)
            self.assertTrue(a['Harvest (kg)'].eq(0).any())


if __name__ == '__main__':
    unittest.main()
