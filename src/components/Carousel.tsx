"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselProps {
  children: React.ReactNode;
  options?: EmblaOptionsType;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
  slideClassName?: string;
  /** Advance every N ms. Omit or pass 0 to leave the carousel manual. */
  autoplay?: number;
}

export default function Carousel({
  children,
  options = { align: "start", loop: false },
  showDots = true,
  showArrows = false,
  className = "",
  slideClassName = "",
  autoplay = 0,
}: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [paused, setPaused] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    };
    // Dijalankan lewat microtask: tidak setState sinkron di dalam effect.
    void Promise.resolve().then(onInit);
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onInit);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onInit);
    };
  }, [emblaApi, onSelect]);

  // Self-advancing carousels: a plain timer rather than a plugin, so the
  // dependency list stays as-is. Pauses on hover/touch and while the tab
  // is hidden, and never runs for readers who ask for reduced motion.
  useEffect(() => {
    if (!emblaApi || !autoplay || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      if (document.hidden) return;
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
      else emblaApi.scrollTo(0);
    }, autoplay);
    return () => clearInterval(id);
  }, [emblaApi, autoplay, paused]);

  const slides = React.Children.toArray(children);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={autoplay ? () => setPaused(true) : undefined}
      onMouseLeave={autoplay ? () => setPaused(false) : undefined}
      onPointerDown={autoplay ? () => setPaused(true) : undefined}
      onPointerUp={autoplay ? () => setPaused(false) : undefined}
    >
      <div className="overflow-hidden carousel-viewport" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((child, i) => (
            <div
              key={i}
              className={`min-w-0 flex-shrink-0 ${slideClassName}`}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            disabled={!canPrev}
            aria-label="Sebelumnya"
            className="carousel-arrow carousel-arrow-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            disabled={!canNext}
            aria-label="Berikutnya"
            className="carousel-arrow carousel-arrow-next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {showDots && scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={`rounded-full transition-all ${
                i === selectedIndex
                  ? "w-6 h-2 bg-[#201e1d]"
                  : "w-2 h-2 bg-[#c9c5c5]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
