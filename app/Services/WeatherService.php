<?php

namespace App\Services;

class WeatherService
{
    public function __construct(
        private readonly GoogleWeatherService $google,
        private readonly OpenMeteoWeatherService $openMeteo,
    ) {}

    /** @return array<string, mixed>|null */
    public function current(): ?array
    {
        $google = $this->google->current();

        if (is_array($google) && ! $google['is_stale']) {
            return $google;
        }

        $openMeteo = $this->openMeteo->current();

        if (is_array($openMeteo)) {
            return $openMeteo;
        }

        return $google;
    }
}
