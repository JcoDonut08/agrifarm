# Product image optimization

Product cards keep their existing size, crop, and layout. They load a separate WebP image with a maximum width and height of 800 pixels at quality 82. Product details and seller edit previews continue using the full image. The first four cards load eagerly; later cards use native browser lazy loading and asynchronous decoding. Existing CSS reserves the image area before loading.

## PHP requirement

Enable GD with WebP support in the PHP installation serving Laravel. On this development machine, GD is enabled in `C:\xampp\php\php.ini` using `extension=gd`. Restart any already-running `php artisan serve` process or XAMPP Apache after changing PHP extensions. A new PHP process can verify support with:

```powershell
php -r "echo extension_loaded('gd') && function_exists('imagewebp') ? 'GD/WebP available' : 'GD/WebP missing';"
```

The hosting server needs its own image extension enabled; this local PHP setting is not included when the repository is deployed.

## Existing images

```powershell
php artisan products:thumbnails
```

This command creates a `.card.webp` copy alongside each currently referenced product photo on Laravel's private `local` disk. It preserves the original files and database records, skips existing copies, and reports generated images, failures, and total file sizes. Run it after transferring existing uploads to a new server. To regenerate copies, use `--force`.

New product uploads automatically generate a thumbnail. Replacing or deleting a product photo also removes its thumbnail. The existing seller and marketplace photo routes select the copy using `size=card`, retaining their ownership/account checks and cache headers. If a copy is unavailable, they serve the original without compressing during a viewing request.

The file-size comparison describes transferred image bytes, not measured page-load time. Database work, email delivery, and other requests can still affect overall responsiveness.
