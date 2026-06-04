"use client";

const C = {
  accent: "var(--skin-accent)",
  border: "var(--skin-border)",
};

interface StarRatingInputProps {
  rating: number | null;
  onChange: (rating: number | null) => void;
}

export default function StarRatingInput({ rating, onChange }: StarRatingInputProps) {
  const stars = [1, 2, 3, 4, 5];

  function handleClick(value: number) {
    if (rating === value) onChange(null);
    else onChange(value);
  }

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <div key={star} className="relative" style={{ width: 28, height: 28 }}>
          {/* Half star - left side */}
          <button
            type="button"
            onClick={() => handleClick(star - 0.5)}
            className="absolute left-0 top-0 h-full overflow-hidden"
            style={{ width: "50%", zIndex: 1 }}
            title={`${star - 0.5} stars`}
          />
          {/* Full star - right side */}
          <button
            type="button"
            onClick={() => handleClick(star)}
            className="absolute right-0 top-0 h-full overflow-hidden"
            style={{ width: "50%", zIndex: 1 }}
            title={`${star} stars`}
          />
          {/* Star visual */}
          <span
            className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none select-none"
            style={{
              color:
                rating !== null && star <= Math.floor(rating)
                  ? C.accent
                  : C.border,
              position: "relative",
            }}
          >
            {/* Partial fill for half star */}
            {rating !== null && star === Math.ceil(rating) && rating % 1 !== 0 ? (
              <span style={{ position: "relative", display: "inline-block" }}>
                <span style={{ color: C.border }}>★</span>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "50%",
                    overflow: "hidden",
                    color: C.accent,
                  }}
                >
                  ★
                </span>
              </span>
            ) : (
              <span style={{ color: rating !== null && star <= rating ? C.accent : C.border }}>★</span>
            )}
          </span>
        </div>
      ))}
      {rating !== null && (
        <span className="ml-1 text-xs font-mono" style={{ color: "var(--skin-muted)" }}>{rating}/5</span>
      )}
    </div>
  );
}
