<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Laravel\Facades\Image;

class ProductPhotoService
{
    public function store(UploadedFile $photo, int $sellerId): string
    {
        $directory = 'products/'.$sellerId;

        // Keep uploads available on PHP installations that have not enabled an image driver yet.
        if (! extension_loaded('gd') && ! extension_loaded('imagick')) {
            $path = $photo->store($directory, 'local');
        } else {
            try {
                $encoded = Image::read($photo)->scaleDown(width: 1600, height: 1600)->toWebp(quality: 82);
                $path = $directory.'/'.Str::uuid().'.webp';
                if (! Storage::disk('local')->put($path, (string) $encoded)) {
                    $path = false;
                }
            } catch (\Throwable $exception) {
                throw ValidationException::withMessages(['photo' => 'The photo could not be processed. Please use a valid image.']);
            }
        }

        if (! $path) {
            throw ValidationException::withMessages(['photo' => 'The photo could not be saved. Please try again.']);
        }

        try {
            $this->createThumbnail($path);
        } catch (\Throwable $exception) {
            $this->delete($path);
            throw ValidationException::withMessages(['photo' => 'The photo could not be processed. Please use a valid image.']);
        }

        return $path;
    }

    public function thumbnailPath(string $path): string
    {
        return $path.'.card.webp';
    }

    public function createThumbnail(string $path, bool $force = false): bool
    {
        if (! extension_loaded('gd') && ! extension_loaded('imagick')) {
            return false;
        }

        $disk = Storage::disk('local');
        $thumbnail = $this->thumbnailPath($path);
        if (! $force && $disk->exists($thumbnail)) {
            return false;
        }

        // Generate outside image requests so viewing a card never waits for compression.
        $encoded = Image::read($disk->path($path))->scaleDown(width: 800, height: 800)->toWebp(quality: 82);
        if (! $disk->put($thumbnail, (string) $encoded)) {
            throw new \RuntimeException('The product thumbnail could not be saved.');
        }

        return true;
    }

    public function displayPath(string $path, bool $thumbnail): string
    {
        $candidate = $this->thumbnailPath($path);

        return $thumbnail && Storage::disk('local')->exists($candidate) ? $candidate : $path;
    }

    public function delete(string|array $paths): void
    {
        $files = [];
        foreach ((array) $paths as $path) {
            $files[] = $path;
            $files[] = $this->thumbnailPath($path);
        }
        Storage::disk('local')->delete($files);
    }
}
