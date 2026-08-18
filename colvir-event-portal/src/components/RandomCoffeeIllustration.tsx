import React from 'react';

/**
 * Иллюстрация раздела Random Coffee.
 *
 * Раньше шапку занимало фото со стока (images.unsplash.com) под плотным темным
 * градиентом: фото было почти не видно, зато страница зависела от внешнего
 * домена — в закрытой корпоративной сети такая картинка просто не загрузится.
 * Здесь тот же сюжет нарисован инлайновым SVG: грузить нечего, фаервол ни при
 * чем, масштабируется без потери качества.
 *
 * Палитра — фирменная синяя, отдельного «теплого» акцента у страницы нет.
 * Цвет точек диалога берется из --color-accent, поэтому в праздничной теме
 * они перекрашиваются вместе со всем интерфейсом.
 *
 * Порядок отрисовки важен: сначала фигуры, затем стол — столик перекрывает
 * силуэты снизу, и коллеги оказываются за ним, а не рядом.
 *
 * Анимации (пар над чашками, мерцание точек) описаны в src/index.css и там же
 * выключаются по prefers-reduced-motion.
 */

const CUP_POSITIONS = [124, 196];

export const RandomCoffeeIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 320 200"
    className={className}
    role="img"
    aria-label="Двое коллег за столиком с чашками кофе"
  >
    {/* --------------------------- Точки диалога -------------------------- */}
    <g fill="var(--color-accent, #1560AA)">
      <circle className="coffee-dot" cx="143" cy="58" r="5" />
      <circle className="coffee-dot coffee-dot-2" cx="160" cy="58" r="5" />
      <circle className="coffee-dot coffee-dot-3" cx="177" cy="58" r="5" />
    </g>

    {/* ---------------------------- Левый коллега ------------------------- */}
    <g>
      <rect x="82" y="76" width="16" height="22" rx="7" fill="#0A2342" />
      <path d="M58 162 C 58 118, 70 96, 90 96 C 110 96, 122 118, 122 162 Z" fill="#1560AA" />
      <circle cx="90" cy="62" r="20" fill="#0A2342" />
    </g>

    {/* ---------------------------- Правый коллега ------------------------ */}
    <g>
      <rect x="222" y="76" width="16" height="22" rx="7" fill="#1560AA" />
      <path d="M198 162 C 198 118, 210 96, 230 96 C 250 96, 262 118, 262 162 Z" fill="#3B7FBF" />
      <circle cx="230" cy="62" r="20" fill="#1560AA" />
    </g>

    {/* ---------------------- Столик: перед фигурами ---------------------- */}
    <ellipse cx="160" cy="148" rx="74" ry="13" fill="#3B7FBF" />
    <ellipse cx="160" cy="145" rx="74" ry="13" fill="#5B93C6" />
    <rect x="152" y="152" width="16" height="32" rx="5" fill="#7DA6C9" />
    <ellipse cx="160" cy="186" rx="34" ry="7" fill="#7DA6C9" />

    {/* ------------------- Чашки: стоят на столешнице ---------------------- */}
    {CUP_POSITIONS.map((cx) => (
      <g key={cx}>
        {/* пар: два завитка на чашку, каждый со своим сдвигом по фазе */}
        <g stroke="#7DA6C9" strokeWidth="3" strokeLinecap="round" fill="none">
          <path
            className={cx === 124 ? 'coffee-steam' : 'coffee-steam coffee-steam-3'}
            d={`M${cx - 5} 112 c -5 -7, 5 -12, 0 -19`}
          />
          <path
            className={cx === 124 ? 'coffee-steam coffee-steam-2' : 'coffee-steam coffee-steam-4'}
            d={`M${cx + 6} 114 c -5 -6, 5 -11, 0 -17`}
          />
        </g>

        <path
          d={`M${cx - 12} 118 h24 v6 a12 12 0 0 1 -24 0 z`}
          fill="#FFFFFF"
          stroke="#1560AA"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d={`M${cx + 12} 120 a6 6 0 0 1 0 9`}
          fill="none"
          stroke="#1560AA"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx={cx} cy="141" rx="17" ry="3" fill="#0A2342" opacity="0.12" />
        <ellipse
          cx={cx}
          cy="137"
          rx="19"
          ry="4.5"
          fill="#FFFFFF"
          stroke="#1560AA"
          strokeWidth="2"
        />
      </g>
    ))}
  </svg>
);
