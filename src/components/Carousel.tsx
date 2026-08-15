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
}

export default function Carousel({
  children,
  options = { align: "start", loop: false },
  showDots = true,
  showArrows = false,
  className = "",
  slideClassName = "",
}: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

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
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const slides = React.Children.toArray(children);

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden" ref={emblaRef}>
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
            onClick={scrollPrev}
            disabled={!canPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 disabled:opacity-0 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 disabled:opacity-0 transition-opacity"
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
