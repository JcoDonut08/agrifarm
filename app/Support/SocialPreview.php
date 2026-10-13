<?php

namespace App\Support;

use Illuminate\Http\Request;

class SocialPreview
{
    /** @return array<int, string> */
    public static function head(Request $request): array
    {
        $origin = rtrim(config('app.url'), '/');
        $title = 'AgriFarm | Fresh produce, grown in Pasig';
        $description = "Shop fresh produce from Pasig's neighborhood growers. Discover local urban farms and support your community with AgriFarm.";
        $image = $origin.'/images/agrifarm-homepage-share-v1.jpg';
        $imageAlt = 'AgriFarm homepage showing a Pasig community garden and the message Fresh produce, grown in Pasig.';

        $tags = [
            ['property', 'og:type', 'website'],
            ['property', 'og:site_name', 'AgriFarm'],
            ['property', 'og:title', $title],
            ['property', 'og:description', $description],
            ['property', 'og:url', self::publicUrl($request, $origin)],
            ['property', 'og:locale', 'en_PH'],
            ['property', 'og:image', $image],
            ['property', 'og:image:type', 'image/jpeg'],
            ['property', 'og:image:width', '1200'],
            ['property', 'og:image:height', '630'],
            ['property', 'og:image:alt', $imageAlt],
            ['name', 'twitter:card', 'summary_large_image'],
            ['name', 'twitter:title', $title],
            ['name', 'twitter:description', $description],
            ['name', 'twitter:image', $image],
            ['name', 'twitter:image:alt', $imageAlt],
        ];

        return array_map(fn (array $tag) => '<meta data-inertia="'.e($tag[1]).'" '.$tag[0].'="'.e($tag[1]).'" content="'.e($tag[2]).'">', $tags);
    }

    private static function publicUrl(Request $request, string $origin): string
    {
        if (in_array($request->path(), ['about', 'contact', 'terms', 'privacy'], true)) {
            return $origin.'/'.$request->path();
        }

        $keys = match ($request->query('page')) {
            'marketplace' => ['page'],
            'product' => ['page', 'product'],
            'seller' => ['page', 'seller'],
            default => [],
        };
        // Share public destinations; account, checkout and authentication tokens stay out.
        $query = $request->is('/') ? array_filter($request->only($keys), fn ($value) => is_string($value)) : [];

        return $origin.'/'.($query ? '?'.http_build_query($query) : '');
    }
}
