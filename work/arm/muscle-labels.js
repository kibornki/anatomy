/* One naming source for anatomical heads, sculpt groups, and legends. */
const ARM_MUSCLE_LABELS=Object.freeze({
 parts:Object.freeze({
  'deltoid-anterior':'삼각근 전면',
  'deltoid-middle':'삼각근 중부',
  'deltoid-posterior':'삼각근 후면',
  'biceps-long':'상완이두근 장두',
  'biceps-short':'상완이두근 단두',
  'triceps-long':'상완삼두근 장두',
  'triceps-lateral':'상완삼두근 외측두',
  'triceps-medial':'상완삼두근 내측두',
  'triceps-aponeurosis':'상완삼두근 건막',
  brachialis:'상완근'
 }),
 forms:Object.freeze({
  deltoid:'삼각근 (전면·중부·후면)',
  biceps:'상완이두근 (장두·단두)',
  triceps:'상완삼두근 (장두·외측두·내측두)',
  brachialis:'상완근'
 }),
 legend:Object.freeze({
  anatomy:Object.freeze({
   front:Object.freeze([
    ['red','상완이두근 장두'],['blue','상완이두근 단두'],
    ['orange','삼각근 (전면·중부)'],['context-key','상완근']
   ]),
   back:Object.freeze([
    ['red','상완삼두근 장두'],['blue','상완삼두근 외측두'],
    ['green','상완삼두근 내측두'],['orange','삼각근 후면'],
    ['neutral','상완삼두근 건막']
   ]),
   side:Object.freeze([
    ['red','상완이두근 장두 · 상완삼두근 장두'],
    ['blue','상완이두근 단두 · 상완삼두근 외측두'],
    ['green','상완삼두근 내측두'],['orange','삼각근 중부'],
    ['context-key','상완근'],['neutral','상완삼두근 건막']
   ])
  }),
  sculpt:Object.freeze([
   ['sculpt-deltoid-key','삼각근 (전면·중부·후면)'],
   ['sculpt-biceps-key','상완이두근 (장두·단두)'],
   ['sculpt-triceps-key','상완삼두근 (장두·외측두·내측두)'],
   ['sculpt-brachialis-key','상완근']
  ])
 })
});
