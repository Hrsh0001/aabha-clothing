'use client';
import React from 'react';

interface BrandLogoProps {
  variant?: 'header' | 'footer';
  className?: string;
  customLogoUrl?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'header',
  className = '',
  customLogoUrl,
}) => {
  const isFooter = variant === 'footer';
  const inkColor = isFooter ? '#F3EDE4' : '#6D2E12';

  if (customLogoUrl && customLogoUrl !== '/logo.svg') {
    return (
      <span className={`inline-flex items-center justify-center select-none ${className}`}>
        <img
          src={customLogoUrl}
          alt="AABHA CLOTHING"
          className={`${isFooter ? 'h-12 sm:h-14' : 'h-8 sm:h-10'} w-auto object-contain block`}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center select-none ${className}`}
      aria-label="AABHA CLOTHING"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 630"
        fill="none"
        role="img"
        aria-label="AABHA CLOTHING Official Logo"
        className={`${
          isFooter ? 'h-14 sm:h-16' : 'h-9 sm:h-11'
        } w-auto object-contain block`}
      >
        {/* 3-Petal Lotus Emblem */}
        <g
          stroke={inkColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Center Petal */}
          <path d="M548 38 C490 112 492 178 543 225 C596 178 598 112 548 38 Z" />
          {/* Left Petal (Overlapping Center Petal) */}
          <path d="M399 118 C484 122 544 166 543 225 C476 232 424 198 399 118 Z" />
          {/* Right Petal (Overlapping Center Petal) */}
          <path d="M692 118 C608 122 544 166 543 225 C610 232 664 198 692 118 Z" />
        </g>

        {/* Lotus Tapered Stem */}
        <path
          d="M549 221 C541 248 522 269 493 277 C491 277 490 274 493 272 C516 260 531 242 537 220 Z"
          fill={inkColor}
        />

        {/* Devanagari 'आ' (Aa) */}
        <g fill={inkColor}>
          {/* Top Shirorekha Bar across the two vertical stems */}
          <path d="M274 276 H474 L464 291 H283 Z" />

          {/* First Vertical Stem with Serif Foot */}
          <path d="M321 284 H344 V458 C344 466 349 470 358 471 V476 H308 V471 C317 470 321 466 321 458 Z" />

          {/* Second Vertical Stem ('ा' Matra) Sweeping into Right Crescent Tail */}
          <path d="M398 284 H422 V408 C422 465 456 502 512 502 C530 502 545 498 559 492 L562 497 C544 509 522 516 497 516 C436 516 398 474 398 408 Z" />

          {/* Diagonal Connector from 'अ' curve to first vertical stem */}
          <path d="M276 398 C296 390 314 374 326 355 L331 366 C317 386 298 401 278 409 Z" />

          {/* Upper & Lower Bowls of 'अ' + Double-Ribbon Left Swash */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M135 326 C149 292 178 273 214 273 C252 273 276 295 276 324 C276 349 257 368 230 375 C272 381 299 406 299 441 C299 483 263 512 216 512 C180 512 152 497 130 473 C117 458 106 447 94 447 C84 447 76 454 71 465 L66 462 C72 446 84 436 99 436 C116 436 131 448 151 466 C171 484 194 494 218 494 C252 494 275 472 275 440 C275 405 247 384 197 382 V373 C234 370 253 351 253 324 C253 299 235 284 209 284 C179 284 154 301 140 329 Z"
          />

          {/* Lower Ribbon of the Left Calligraphic Swash */}
          <path d="M106 443 C121 446 133 462 147 479 C163 498 184 508 212 508 C236 508 256 499 270 484 L264 478 C251 491 234 499 214 499 C189 499 170 489 155 470 C140 452 126 438 108 437 Z" />
        </g>

        {/* Latin Serif 'B' */}
        <path
          fill={inkColor}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M468 308 H536 C569 308 588 323 588 347 C588 367 573 381 550 386 C579 390 598 407 598 431 C598 458 576 476 538 476 H468 V471 C479 470 483 466 483 456 V328 C483 318 479 314 468 313 Z M505 382 H531 C554 382 566 369 566 348 C566 327 553 317 530 317 H505 Z M505 466 H534 C561 466 575 453 575 431 C575 407 559 392 531 392 H505 Z"
        />

        {/* Latin Serif 'H' */}
        <path
          fill={inkColor}
          d="M615 308 H669 V313 C658 314 654 318 654 328 V385 H725 V328 C725 318 721 314 710 313 V308 H764 V313 C753 314 749 318 749 328 V456 C749 466 753 470 764 471 V476 H710 V471 C721 470 725 466 725 456 V396 H654 V456 C654 466 658 470 669 471 V476 H615 V471 C626 470 630 466 630 456 V328 C630 318 626 314 615 313 Z"
        />

        {/* Latin Serif 'A' */}
        <path
          fill={inkColor}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M841 304 H846 L903 456 C907 466 912 470 922 471 V476 H872 V471 C882 470 884 465 881 455 L869 422 H806 L794 454 C790 465 793 470 804 471 V476 H764 V471 C773 470 779 465 783 454 Z M810 411 H865 L838 336 Z"
        />

        {/* Sub-wordmark 'C L O T H I N G' */}
        <g fill={inkColor}>
          {/* C */}
          <path d="M289 576 C284 581 277 584 269 584 C254 584 244 574 244 560 C244 546 254 536 269 536 C277 536 284 539 289 544 L283 550 C279 546 275 544 269 544 C259 544 253 551 253 560 C253 569 259 576 269 576 C275 576 279 574 283 570 Z" />
          {/* L */}
          <path d="M328 537 H337 V575 H360 V583 H328 Z" />
          {/* O */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M415 536 C430 536 440 546 440 560 C440 574 430 584 415 584 C400 584 390 574 390 560 C390 546 400 536 415 536 Z M415 544 C405 544 399 551 399 560 C399 569 405 576 415 576 C425 576 431 569 431 560 C431 551 425 544 415 544 Z"
          />
          {/* T */}
          <path d="M472 537 H509 V545 H495 V583 H486 V545 H472 Z" />
          {/* H */}
          <path d="M542 537 H551 V556 H572 V537 H581 V583 H572 V564 H551 V583 H542 Z" />
          {/* I */}
          <path d="M618 537 H627 V583 H618 Z" />
          {/* N */}
          <path d="M665 537 H674 L696 568 V537 H705 V583 H697 L674 551 V583 H665 Z" />
          {/* G */}
          <path d="M786 559 H766 V566 H777 V573 C774 575 769 576 764 576 C754 576 748 569 748 560 C748 551 754 544 764 544 C770 544 775 546 778 550 L784 544 C779 539 772 536 764 536 C749 536 739 546 739 560 C739 574 749 584 764 584 C773 584 781 581 786 577 Z" />
        </g>
      </svg>
    </span>
  );
};
