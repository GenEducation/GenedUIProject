'use client';

import React from 'react';
import { getSubjectConfig } from '@/constants/subjectConfig';
import { useSubjectCatalog } from '@/features/subjects/subjectCatalog';
import { SubjectIcon } from '@/features/subjects/subjectPresentation';

export const SubjectIconShowcase: React.FC = () => {
  const entries = useSubjectCatalog((state) => state.subjects);
  const subjects = entries.map((entry) => entry.name);

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 p-12 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Subject Icons & Color System
          </h1>
          <p className="text-lg text-slate-600">
            Component icons with the new student-centric color palette
          </p>
        </div>

        {/* Icons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {subjects.map((subject) => {
            const config = getSubjectConfig(subject);

            return (
              <div
                key={subject}
                className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-shadow"
              >
                {/* Icon display */}
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center mb-6 transition-colors"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <SubjectIcon
                    subject={subject}
                    size={40}
                    style={{ '--icon-color': config.color, color: config.color } as React.CSSProperties}
                  />
                </div>

                {/* Subject name */}
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {subject}
                </h3>

                {/* Color swatch */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-mono text-slate-600">
                    {config.color}
                  </span>
                </div>

                {/* Color name */}
                <p className="text-xs text-slate-500 font-medium">
                  Taxonomy subject
                </p>
              </div>
            );
          })}
        </div>

        {/* Agent Cards Example */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            In Context: Agent Cards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subjects.map((subject) => {
              const config = getSubjectConfig(subject);

              return (
                <div
                  key={`card-${subject}`}
                  className="bg-white rounded-xl p-5 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                  style={{ borderLeftColor: config.color }}
                >
                  {/* Icon container */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <SubjectIcon
                      subject={subject}
                      size={24}
                      style={{ '--icon-color': config.color, color: config.color } as React.CSSProperties}
                    />
                  </div>

                  {/* Subject label */}
                  <h4 className="font-bold text-slate-900 mb-1">
                    {subject}
                  </h4>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
                    Grade 4
                  </p>

                  {/* Action button */}
                  <button
                    className="w-full py-2 px-3 text-sm font-bold rounded-lg border-2 transition-colors"
                    style={{
                      borderColor: config.color,
                      color: config.color,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = config.bgColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    START →
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Color Palette Reference */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Color Palette Reference
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subjects.map((subject) => {
              const config = getSubjectConfig(subject);

              return (
                <div key={`palette-${subject}`}>
                  <p className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                    {subject}
                  </p>

                  <div className="space-y-2">
                    {/* Main color */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Primary</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-slate-200"
                          style={{ backgroundColor: config.color }}
                        />
                        <code className="text-xs font-mono text-slate-600">
                          {config.color}
                        </code>
                      </div>
                    </div>

                    {/* Background color */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Background</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-slate-200"
                          style={{ backgroundColor: config.bgColor }}
                        />
                        <code className="text-xs font-mono text-slate-600">
                          rgba
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
