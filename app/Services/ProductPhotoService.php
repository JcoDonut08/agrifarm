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

        return $path;
    }
}
