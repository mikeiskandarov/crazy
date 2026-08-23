# Прогнозные и реконструированные модели live game shows

Статус: нормативная публичная реконструкция Crazy Time Global и редакционные модели остальных игр. Дата среза исследования: 2026-08-23.

Для всех новых расчётов Crazy Time канонична модель `crazy-time-global-reconstruction-v1@1.0.0` из раздела 3. Это **не** официальная PAR sheet Evolution: опубликованные правила определяют колесо, выплаты и средние RTP, но не раскрывают полные веса Top Slot и bonus RNG. Поэтому документ строго разделяет:

- `A — official`: опубликованные правила и RTP;
- `B — observed`: независимые эмпирические частоты с указанным размером выборки;
- `C — reconstructed`: выбранная воспроизводимая достройка неизвестных параметров регуляризованными maximum-entropy и exponential-tilt допущениями.

Существующий кодовый preset `crazy-time-forecast-v1@1.0.0` остаётся legacy editorial fixture для уже собранного ролика. Его хвост, seed и результат `$15,057 / 15000×` нельзя использовать в новых вероятностных расчётах или представлять как математику Crazy Time.

Обязательная публичная маркировка новой модели:

```text
Reconstructed model • published RTP + observed data • not official internal odds
```

## 1. Какие пять игр выбраны

Публичного проверяемого рейтинга Evolution по числу ставок или активных игроков нет, поэтому «пять самых популярных» здесь — рабочая редакционная выборка из наиболее заметных и репрезентативных wheel/game-show продуктов:

1. **Crazy Time** — сам Evolution называет её самым популярным live casino game show.
2. **Lightning Storm** — в отчёте Evolution за 2024 год названа крупнейшим запуском в категории game shows.
3. **Funky Time** — позиционировалась как крупнейшая новая game-show разработка со времён Crazy Time.
4. **MONOPOLY Live** — долгоиграющий featured-продукт на базе глобально узнаваемой игры.
5. **Dream Catcher** — базовая money-wheel механика, на которой выросла часть последующих game shows.

Это выбор для библиотеки моделей, а не утверждение точных мест 1–5 по коммерческой популярности.

## 2. Два класса моделей и семантика выплаты

### 2.1. Реконструкция Crazy Time

Crazy Time нельзя честно представить одной общей PMF без указания, куда поставлены деньги. Восемь bet spots имеют разные hit rate, RTP и хвост. Новая модель поэтому принимает stake vector в каноническом порядке:

```text
[1, 2, 5, 10, coin_flip, cash_hunt, pachinko, crazy_time]
```

Если будущая задача говорит только `$1 per round` и не задаёт распределение, проект использует явный default `spot-1-only = [1,0,0,0,0,0,0,0]`. Для бонусного или смешанного сценария stake vector обязателен; старую свёрнутую таблицу нельзя подставлять молча.

`N:1` означает net win `N` сверх возвращаемой выигравшей ставки. Для stake vector `s`, общей ставки `S = Σs_i`, результата главного колеса `X` и итоговых odds `O_X`:

```text
grossCash = s_X × (1 + O_X)
netCash   = grossCash - S
grossRate = grossCash / S
```

Все проигравшие bet spots теряют stake. При `s_X = 0` gross return раунда равен нулю.

### 2.2. Legacy editorial contract

Остальные четыре forecast-модели и существующий `approximate-v0` по-прежнему сворачивают раунд в один итоговый **gross multiplier** на редакционную единицу общей ставки $1. Main wheel, усилители и завершившийся bonus уже учтены в одном synthetic outcome.

- стартовый банк: $100;
- ставка: $1 за завершённый раунд;
- горизонт: 500 раундов;
- population: 1 000 независимых прогонов;
- `weight`: частота на 1 000 000 модельных раундов;
- `0×`: ставка потеряна; `1×`: ставка возвращена; `N×`: gross return, включая возвращаемую ставку;
- целевой средний gross return каждой legacy-таблицы: `0.9600`;
- раунды независимы; состояние bonus между раундами не переносится;
- модель не утверждает вероятности конкретного bet spot и не советует стратегию ставок.

Три карточки объявления результатов:

| Карточка | Правило |
| --- | --- |
| `RARE LUCKY` | количество финальных bankroll в диапазоне $500–$2 000 включительно |
| `VERY LUCKY` | количество финальных bankroll в диапазоне $3 000–$10 000 включительно |
| `BEST OF 1,000` | фактический rank #1 по final bankroll; редакционный прогнозный коридор $10 000–$30 000 |

Промежуток $2 000–$3 000 намеренно не относится к первым двум карточкам. Третья карточка — ранг, а не ещё одна взаимоисключающая денежная полоса.

## 3. Crazy Time Global — каноническая реконструкция v1

### 3.1. Scope, идентификатор и границы уверенности

| Поле | Значение |
| --- | --- |
| Model ID | `crazy-time-global-reconstruction-v1` |
| Version | `1.0.0` |
| Variant | global / non-US |
| Source cutoff | 2026-08-23 |
| Main wheel и RTP | `A — official` |
| Top Slot marginals | `B — observed`, 457 188 spins |
| Crazy Time conditional Top Slot | `B — observed`, 70 112 target lands |
| Остальной joint Top Slot | `C — reconstructed` |
| Bonus payout shapes | `C — reconstructed` |

Модель предназначена для вероятностных, bankroll- и контентных симуляций глобальной версии. Она не утверждает, что восстановила закрытый source code, seed, PAR sheet или сертифицированные внутренние RNG weights Evolution. Средние значения по каждому bet spot привязаны к опубликованному RTP; variance и особенно extreme tail остаются оценкой.

Уровни уверенности различаются: состав главного колеса, правила, payout convention и показанный RTP — высокий; empirical marginals Top Slot — средний/высокий для периода выборки; joint Top Slot и формы центральной части бонусов — средний; Rescue, зависимости внутри bonus и вероятности самых редких хвостов — низкий. Совпадение среднего RTP само по себе не валидирует max-of-1,000, ruin probability или шанс выигрыша `10,000×+`.

### 3.2. Главное колесо

54 сектора равны по размеру. Для одного завершённого раунда:

```text
X_t ~ Categorical([21,13,7,4,4,2,2,1] / 54)
X_t independent of X_(t-1), X_(t-2), ...
```

| Bet spot | Секторов | Вероятность | Средний интервал |
| --- | ---: | ---: | ---: |
| `1` | 21 | 38.888889% | 2.5714 spins |
| `2` | 13 | 24.074074% | 4.1538 spins |
| `5` | 7 | 12.962963% | 7.7143 spins |
| `10` | 4 | 7.407407% | 13.5 spins |
| Coin Flip | 4 | 7.407407% | 13.5 spins |
| Cash Hunt | 2 | 3.703704% | 27 spins |
| Pachinko | 2 | 3.703704% | 27 spins |
| Crazy Time | 1 | 1.851852% | 54 spins |

Все бонусы вместе занимают `9/54 = 1/6` колеса. v1 принимает опубликованный Pennsylvania regulatory layout как clockwise order для wheel renderer; он не влияет на categorical probabilities и должен быть визуально сверен с конкретной global studio перед рендером:

```text
1,2,5,1,2,Pachinko,1,5,1,2,1,Coin Flip,1,2,1,10,2,Cash Hunt,
1,2,1,5,1,Coin Flip,1,5,2,10,1,Pachinko,1,2,5,1,2,Coin Flip,
1,10,1,5,1,Cash Hunt,1,2,5,1,2,Coin Flip,2,1,10,2,1,Crazy Time
```

Никаких hot/cold, «давно не выпадало», времени суток, числа игроков или dealer-state в базовой модели нет. Выборка Tracksino на 463 765 spins не обнаружила заметной зависимости результата от дня или часа; это поддерживает, но не доказывает IID-допущение.

### 3.3. Официальные RTP как жёсткие moment constraints

Rules/paytable возвращает winning stake сверх odds. Поэтому для единичной ставки на spot `i`:

```text
G_i = 1{X=i} × (1 + O_i)
RTP_i = P(X=i) × (1 + E[O_i | X=i])
```

| Spot | RTP | House edge | `E[gross | hit]` | `E[net odds | hit]` |
| --- | ---: | ---: | ---: | ---: |
| `1` | 96.08% | 3.92% | 2.470629× | 1.470629× |
| `2` | 95.95% | 4.05% | 3.985615× | 2.985615× |
| `5` | 95.78% | 4.22% | 7.388743× | 6.388743× |
| `10` | 95.73% | 4.27% | 12.923550× | 11.923550× |
| Coin Flip | 95.70% | 4.30% | 12.919500× | 11.919500× |
| Cash Hunt | 95.27% | 4.73% | 25.722900× | 24.722900× |
| Pachinko | 94.33% | 5.67% | 25.469100× | 24.469100× |
| Crazy Time | 94.41% | 5.59% | 50.981400× | 49.981400× |

Публичный Evolution How to Play называет диапазон `94.41–96.08%`, но официальные rules tables отдельно дают Pachinko `94.33%`. Каноничен полный paytable, то есть фактический диапазон модели `94.33–96.08%`.

RTP опубликованы с точностью до `0.01` процентного пункта. Поэтому числа выше — **display targets**: v1 условно считает показанные значения точными при калибровке, но не утверждает, что скрытый RTP равен им до последнего знака. `O_i` хранится как net `winMultiplier`; gross multiplier на выигравшую ставку равен `1 + O_i`. Соответственно cap `10,000×`/`20,000×` ограничивает `winMultiplier`, а максимальный gross до денежного table cap равен `10,001×`/`20,001×`.

Для stake fractions `w_i = s_i / Σs_i` ожидаемый portfolio RTP линейный:

```text
RTP_portfolio = Σ w_i × RTP_i
```

Контрольные значения: четыре number spots поровну — `95.885%`; четыре bonus spots поровну — `94.9275%`; все восемь поровну — `95.40625%`.

### 3.4. Top Slot: observed marginals

В каждый раунд Top Slot выбирает target `J` и multiplier `K`. `K=1` ниже означает reel miss: target показан, но multiplier не усиливает выплату. Tracksino опубликовал точные counts по 457 188 spins.

| Target `J` | Count | `P(J)` |
| --- | ---: | ---: |
| `1` | 60 565 | 13.247286% |
| `2` | 60 929 | 13.326903% |
| `5` | 52 038 | 11.382189% |
| `10` | 37 572 | 8.218063% |
| Coin Flip | 53 721 | 11.750308% |
| Cash Hunt | 55 289 | 12.093275% |
| Pachinko | 63 993 | 13.997087% |
| Crazy Time | 73 081 | 15.984890% |

| `K` | Count | `P(K)` |
| ---: | ---: | ---: |
| miss / `1×` | 98 458 | 21.535561% |
| `2×` | 113 292 | 24.780178% |
| `3×` | 100 363 | 21.952238% |
| `4×` | 46 513 | 10.173714% |
| `5×` | 40 600 | 8.880373% |
| `7×` | 23 918 | 5.231546% |
| `10×` | 15 351 | 3.357700% |
| `15×` | 7 854 | 1.717893% |
| `20×` | 5 850 | 1.279561% |
| `25×` | 3 512 | 0.768174% |
| `50×` | 1 477 | 0.323062% |

Marginal mean `E[K] = 3.7896423353`. Target и multiplier нельзя считать независимыми: при независимом перемножении marginals number bets не воспроизводят официальный paytable. `K=1` — только вычислительный alias для reel miss/no boost, а не видимый результат `1×` на правом барабане.

Empirical counts — канонический plug-in v1, но это не доказательство точных virtual-reel weights. Простые кандидаты `[68,68,58,42,60,62,72,82]/512` для target и `[882,1015,899,417,364,214,138,70,52,31,14]/4096` для `K` согласуются с выборкой (`Pearson χ²≈4.57`, `df=7`; `χ²≈6.31`, `df=10`). Это обязательный rationalized sensitivity variant для tail review, но не default и не предполагаемый PAR sheet: при его использовании все constraints надо пересчитать как новую model version, а не смешивать с таблицами v1.

### 3.5. Joint Top Slot reconstruction

Для number spot `n` опубликованный RTP display определяет требуемый conditional mean multiplier в принятой v1-конвенции. Здесь `p_n=P(main=n)`, `q_n=P(J=n)`:

```text
RTP_n = p_n × {1 + n × [1 + q_n × (d_n - 1)]}
d_n = E[K | J=n]
```

Получаем `d_1=4.5526415473`, `d_2=4.6978411468`, `d_5=3.4402035796`, `d_10=3.3406365842`.

Для Crazy Time используется опубликованная Tracksino conditional row из 70 112 target lands, `d_CT=3.5082154267`. Она относится к срезу `435,882` spins, тогда как общие marginals выше — к более позднему срезу `457,188` spins; выборки пересекаются, но не образуют одну observed contingency table. v1 синтетически задаёт CT row как `P(J=CT) × observed P(K|J=CT)` при stationarity assumption.

Для Coin Flip, Cash Hunt и Pachinko публичных conditional counts нет. Priors из реконструкции Wizard of Odds сопоставлены по ID, а не по позиции в массиве: `Coin=3.486176`, `Cash=3.287086`, `Pachinko=3.952433`. Это важно, потому что в одной из промежуточных Wizard-таблиц подписи Coin/Pachinko переставлены. Ко всем трём применена одинаковая поправка `−0.0708352195`, чтобы сохранить различия priors и одновременно согласовать свежий marginal mean `E[K]`. Это регуляризатор, а не вывод о реальном RNG: один weighted-sum constraint оставляет две степени свободы между тремя means. Итоговые row means:

| Target | `E[K | J]` | Статус |
| --- | ---: | --- |
| `1` | 4.5526415473 | official RTP constraint |
| `2` | 4.6978411468 | official RTP constraint |
| `5` | 3.4402035796 | official RTP constraint |
| `10` | 3.3406365842 | official RTP constraint |
| Coin Flip | 3.4153407805 | reconstructed |
| Cash Hunt | 3.2162507805 | reconstructed |
| Pachinko | 3.8815977805 | reconstructed |
| Crazy Time | 3.5082154267 | observed conditional row |

Оставшиеся joint cells — уникальное maximum-entropy решение:

```text
maximize  -Σ_i,k p(i,k) log p(i,k)
subject to:
  Σ_k p(i,k)     = observed P(J=i)
  Σ_i p(i,k)     = observed P(K=k)
  Σ_k k p(i,k)   = P(J=i) × d_i
  CT row         = observed CT conditional counts / 70,112
  p(i,k)         >= 0
```

Ниже `P(K | J)`; строки и столбцы при полной точности воспроизводят исходные counts и means.

| Target / `K` | 1× | 2× | 3× | 4× | 5× | 7× | 10× | 15× | 20× | 25× | 50× |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `1` | 19.17733% | 23.10836% | 21.28743% | 10.24612% | 9.05702% | 5.87714% | 4.40965% | 2.54093% | 2.09317% | 1.42470% | 0.77814% |
| `2` | 18.91263% | 22.87697% | 21.15525% | 10.22163% | 9.07009% | 5.93094% | 4.50151% | 2.64409% | 2.22032% | 1.54050% | 0.92606% |
| `5` | 22.39922% | 25.58096% | 22.33437% | 10.18856% | 8.53575% | 4.97540% | 3.17815% | 1.40048% | 0.88227% | 0.45924% | 0.06561% |
| `10` | 22.87811% | 25.89756% | 22.41149% | 10.13363% | 8.41489% | 4.81887% | 2.99748% | 1.26367% | 0.76161% | 0.37927% | 0.04342% |
| Coin Flip | 22.51404% | 25.65799% | 22.35450% | 10.17629% | 8.50753% | 4.93811% | 3.13446% | 1.36676% | 0.85201% | 0.43884% | 0.05948% |
| Cash Hunt | 23.55577% | 26.32497% | 22.49115% | 10.04009% | 8.23101% | 4.59423% | 2.74992% | 1.08732% | 0.61463% | 0.28707% | 0.02385% |
| Pachinko | 20.76752% | 24.40621% | 21.92751% | 10.29344% | 8.87403% | 5.47736% | 3.81253% | 1.93855% | 1.40916% | 0.84636% | 0.24732% |
| Crazy Time | 22.79638% | 25.12123% | 21.97769% | 10.07816% | 9.83141% | 4.99059% | 2.07097% | 1.26512% | 1.07400% | 0.53771% | 0.25673% |

Это least-informative closure assumption, а не «статистически наиболее вероятный» реальный joint reel strip. После фиксации CT row ограничения всё ещё оставляют допустимому joint polytope `54` степени свободы; strict concavity лишь выбирает одну воспроизводимую точку maximum entropy. При появлении совместных counts таблица заменяется и получает новую model version.

### 3.6. Общий способ калибровки bonus PMF

Wizard of Odds опубликовал полезные observed/best-guess shapes бонусов, но вручную подогнал все spots примерно к `96.08%`, что конфликтует с официальным per-spot paytable. Мы используем только форму baseline `p0(x)` и применяем однопараметрический value tilt:

```text
p_lambda(x) = p0(x) × exp(lambda × x) / Z(lambda)
```

Для bonus spot `s`, cap-aware value function `V_s(a;lambda)` и unconditional joint Top Slot row `p(s,k)` корень считается по полной формуле, а не по произведению средних:

```text
F_s(lambda) = [1 - P(J=s)] × V_s(1;lambda)
              + Σ_k P(J=s,K=k) × V_s(k;lambda)
P(main=s) × [1 + F_s(lambda)] = displayed RTP_s
```

`lambda` решается после Top Slot и после конечного cap, поэтому Pachinko/Crazy Time точно совпадают с опубликованным display target в принятой v1-конвенции. Rescue Flip/Drop не моделируется отдельной второй случайностью: tilt поглощает только его неизвестный вклад в **первый момент**, но не восстанавливает частоту, variance или форму terminal tail. Добавлять Rescue поверх этих PMF без полной повторной калибровки нельзя — expectation будет посчитан дважды.

### 3.7. Coin Flip

Official mechanics: случайные low/high значения назначаются двум сторонам, физический coin выбирает сторону, Top Slot умножает обе, возможен Rescue Flip. Для финансовых расчётов одного игрока пары и rescue свёрнуты в final base net-odds PMF до Top Slot.

Baseline: low weights `[37,43,25,23]/128` для `[2,3,4,5]`, high weights `[16,17,14,15,17,18,13,10,7,1]/128` для `[7,8,9,10,12,15,20,25,50,100]`, fair side `1/2`. Калибровка `lambda = +0.0000280417721` даёт `E[base]=9.2844736258`.

| Base odds | Probability | Base odds | Probability |
| ---: | ---: | ---: | ---: |
| 2× | 14.450174% | 10× | 5.859493% |
| 3× | 16.793916% | 12× | 6.641131% |
| 4× | 9.764178% | 15× | 7.032377% |
| 5× | 8.983296% | 20× | 5.079651% |
| 7× | 6.249600% | 25× | 3.907972% |
| 8× | 6.640386% | 50× | 2.737499% |
| 9× | 5.468707% | 100× | 0.391620% |

При match payout odds равны `base × K`; иначе `base`. Support модели до `5,000:1`. В одном реальном bonus все игроки видят общие side values и один физический flip; их выплаты нельзя генерировать независимыми Coin draws.

### 3.8. Cash Hunt

Official mechanics: 108 random multipliers показываются, затем закрываются и перемешиваются; игрок выбирает один target. До reveal все позиции exchangeable, поэтому стратегия выбора символа не меняет expectation.

Baseline — смесь трёх наблюдавшихся 108-cell boards с предположенными Wizard-весами `40% / 10% / 50%`; это weak prior, а не измеренная частота boards. Calibration `lambda = +0.0000487132713`, `E[base]=19.4972893260`.

| Base odds | Probability | Base odds | Probability |
| ---: | ---: | ---: | ---: |
| 5× | 13.508985% | 25× | 4.075169% |
| 7× | 12.862547% | 50× | 3.523753% |
| 10× | 20.453514% | 75× | 2.599614% |
| 15× | 19.069911% | 100× | 3.811216% |
| 20× | 20.000505% | 500× | 0.094786% |

При match payout odds равны `base × K`; иначе `base`. Support модели до `25,000:1`. Таблица является one-player marginal: дробные вероятности после tilt не задают буквальную целочисленную доску из 108 ячеек. Для нескольких игроков один bonus должен генерировать общую board/permutation, поэтому их результаты коррелированы; независимые draws из этой PMF допустимы только между разными раундами.

### 3.9. Pachinko

Official mechanics: 16 landing positions, случайная drop zone, Top Slot применяется до drop, `DOUBLE` удваивает значения и запускает новый drop, multiplier cap `10,000×`; возможен Rescue Drop.

Baseline best-guess direct-landing weights Wizard: `[6,8,16,56,60,36,23,10,9,5,7,4,2,14]/256` для `[2,3,5,7,10,15,20,25,35,40,50,100,200,DOUBLE]`. Вероятность `DOUBLE=14/256` сохранена; fixed values наклонены с `lambda = −0.0003935447601`.

| Landing | Probability | Landing | Probability |
| ---: | ---: | ---: | ---: |
| 2× | 2.357187% | 25× | 3.893245% |
| 3× | 3.141679% | 35× | 3.490158% |
| 5× | 6.278414% | 40× | 1.935165% |
| 7× | 21.957161% | 50× | 2.698590% |
| 10× | 23.497771% | 100× | 1.512005% |
| 15× | 14.070948% | 200× | 0.726828% |
| 20× | 8.972100% | DOUBLE | 5.468750% |

State machine для начального accumulator `a = K` при Top Slot match, иначе `a=1`:

```text
draw landing L
if L is fixed: pay min(10_000, a × L)
if L is DOUBLE: a = 2a; redraw
if every fixed value has reached cap: DOUBLE becomes 10_000 and settles
```

Калиброванный mean без Top Slot и с cap — `17.4383637881`; полный conditional net odds с Top Slot — `24.4691`, ровно display constraint. Direct categorical landing — one-player marginal approximation: реальная drop zone и конечная позиция puck могут быть связаны, поэтому модель не пригодна для анализа траектории puck или совместных результатов нескольких drop.

### 3.10. Crazy Time bonus

Official mechanics: virtual 64-segment wheel, три flappers, `DOUBLE`/`TRIPLE` продолжают только выбравших соответствующий flapper, cap `20,000×`; Top Slot применяется до bonus spin. Flapper colors считаются exchangeable.

Wizard наблюдал только три из потенциально многих wheel layouts. v1 трактует их как **effective latent families**, а не утверждает, что сервер выбирает ровно из трёх шаблонов. Их смесь откалибрована не как равная: Tracksino за 11 962 bonus spins на каждый из трёх flappers наблюдал 3 777 doubles и 97 triples из 35 886 flapper outcomes. При допущении, что эти три состава исчерпывают эффективную смесь, это даёт weights:

```text
wheel_1 = 0.2712478404
wheel_2 = 0.5557599064
wheel_3 = 0.1729922532
```

Они точно воспроизводят observed `P(DOUBLE)=10.524996%` и `P(TRIPLE)=0.270300%` при составах families ниже. Fixed values получают общий `lambda = −0.0014426709966`.

| Outcome | Wheel 1 | Wheel 2 | Wheel 3 |
| --- | ---: | ---: | ---: |
| 10× | 19.126525% | — | 14.556462% |
| 15× | 20.571476% | 17.666980% | 12.846079% |
| 20× | 10.997334% | 15.945455% | 12.753749% |
| 25× | 12.478048% | 28.495528% | 26.906926% |
| 50× | 9.027018% | 25.959093% | 22.900387% |
| 100× | 2.799599% | 5.682944% | 5.681779% |
| 200× | — | — | 1.229617% |
| DOUBLE | 25.000000% | 6.250000% | 1.562500% |
| TRIPLE | — | — | 1.562500% |

State machine для `a = K` при Top Slot match, иначе `a=1`:

```text
sample wheel family once for the bonus
draw chosen flapper outcome L
if L is fixed: pay min(20_000, a × L)
if L is DOUBLE: a = 2a; respin same family
if L is TRIPLE: a = 3a; respin same family
when every fixed value reaches cap: DOUBLE/TRIPLE become 20_000 and settle
```

Калиброванный mean без Top Slot и с cap — `35.6965820641`; полный conditional net odds с Top Slot — `49.9814`, то есть gross `50.9814`. Независимая Tracksino выборка дала gross `50.81×`, близкий к теоретическому constraint, но это cross-check среднего, не валидация tail.

Три flapper читают одно колесо с фиксированными смещениями и потому не независимы. Таблица выше моделирует marginal заранее выбранного flapper; для нескольких игроков на разных цветах нужен joint wheel-position renderer. v1 также предполагает, что effective family выбирается один раз на bonus и сохраняется при `DOUBLE/TRIPLE` respins.

### 3.11. Полный алгоритм одного раунда

```text
input: stake vector s[8], seeded RNG

1. debit S = sum(s)
2. sample main-wheel X from exact [21,13,7,4,4,2,2,1]/54
3. sample (J,K) from reconstructed joint Top Slot table
4. if X is 1/2/5/10:
     winMultiplier = X * (K if J == X else 1)
   else:
     start accumulator = K if J == X else 1
     run the matching calibrated bonus state machine
     winMultiplier = its final capped net-odds multiplier
5. grossMultiplier = 1 + winMultiplier
6. credit s[X] * grossMultiplier
7. round money only at settlement boundary; internal probabilities/multipliers stay unrounded
```

Main wheel, Top Slot, bonus RNG and stake size are assumed independent. Правила называют компоненты random, а large-sample wheel frequencies согласуются с геометрией, но Evolution не публикует внутрипроцессное доказательство независимости; это material `C` assumption.

### 3.12. Контрольные проверки

Обязательные deterministic tests любой реализации:

1. Main-wheel mass равна `54/54`; bonus trigger mass равна `1/6`.
2. Top Slot target counts и multiplier counts нормализуются ровно из `457188`.
3. Joint Top Slot table имеет mass `1`, нужные marginals и `E[K]=3.7896423353`.
4. Все bonus PMF имеют mass `1`; recursion завершается из-за cap.
5. Аналитические RTP после cap совпадают с опубликованными display targets: `0.9608 / 0.9595 / 0.9578 / 0.9573 / 0.9570 / 0.9527 / 0.9433 / 0.9441` в каноническом spot order.
6. Monte Carlo на не менее чем `10,000,000` rounds должен согласоваться с analytical mean в пределах заранее рассчитанного 99% confidence interval; фиксированная абсолютная погрешность без учёта variance запрещена.
7. PRNG sampling должен использовать rejection sampling, а не `uint32 % totalWeight`, если modulus не делит `2^32`.

Для canonical default `spot-1-only` итоговая PMF одного раунда:

| Gross | Probability | Gross | Probability |
| ---: | ---: | ---: | ---: |
| 0× | 61.111111% | 6× | 0.466593% |
| 2× | 34.725129% | 8× | 0.302774% |
| 3× | 1.190479% | 11× | 0.227173% |
| 4× | 1.096669% | 16× | 0.130902% |
| 5× | 0.527852% | 21× | 0.107834% |
| 26× | 0.073397% | 51× | 0.040088% |

Её mean gross `0.9608`, стандартное отклонение около `1.96636×`. Поэтому универсальный `15,000×` outcome для неуказанной `$1` ставки больше не допустим: он возможен только при явной ставке на соответствующий bonus spot.

### 3.13. Правила использования в следующих расчётах

- Всегда указывать `crazy-time-global-reconstruction-v1@1.0.0`, variant и stake vector.
- Если stake vector не указан, применять только `spot-1-only`; не выбирать более драматичный хвост постфактум.
- Для historical replay использовать фактические outcomes, а не probability model.
- Не прогнозировать следующий spin из истории; rounds IID.
- Не называть reconstructed variance/tail официальными odds Evolution.
- Для tail-sensitive вывода считать как минимум empirical v1 и rationalized `/512 + /4096` sensitivity variant; существенное расхождение выводить как model uncertainty, а не усреднять молча.
- Денежный table/operator cap хранить отдельно от multiplier caps `10,000×` Pachinko и `20,000×` Crazy Time.
- Любое изменение source counts, bonus priors, cap semantics или calibration method требует новой model version и пересчёта frozen artifacts.
- Legacy `crazy-time-forecast-v1@1.0.0` разрешён только для воспроизведения старого internal-review build.

### 3.14. Архитектура RNG и запрет adaptive-логики

Патент `US20210241579A1` структурно описывает систему с физическим главным wheel outcome и отдельным RNG, который выдаёт связанную пару secondary target/multiplier до остановки колеса. Патент не называет Crazy Time и не раскрывает weights, поэтому это medium-confidence архитектурная аналогия, а не официальный PAR source. Она согласуется с причинной моделью `physical main wheel + joint Top Slot RNG + отдельный bonus process`.

UK Gambling Commission RTS 7 запрещает compensated/adaptive изменение вероятностей, отбрасывание валидного RNG output и изменение скрытой prize map во время игры. Это нормативная граница для лицензируемой конфигурации, не доказательство конкретной реализации. Публичных свидетельств зависимости результата от размера ставки, конкретного игрока, истории или «долго не выпадало» не найдено; v1 таких состояний не содержит.

### 3.15. Региональные версии

Эта модель не применяется к US/PA tables. Временный Pennsylvania regulation 2024 задавал Top Slot только `[1,2,3,4,5,7,10,15,20]`, Crazy Time без `TRIPLE`, другие bonus ranges и US ceiling `10,000×`. Правила истекали 2026-03-23, но документируют отдельную региональную math configuration. Нельзя смешивать их с global support `[1,2,3,4,5,7,10,15,20,25,50]` и global `20,000×` Crazy Time cap.

### 3.16. Legacy preset текущего ролика

Executable preset `crazy-time-forecast-v1@1.0.0` остаётся в `approximate-v0` без изменения, чтобы не ломать уже собранные artifacts. Его synthetic table имеет mass `1,000,000`, mean gross `0.9600` и намеренно редакционный best-of-1,000 tail. Он не является fallback новой модели и не должен участвовать в новых расчётах.

## 4. Lightning Storm — forecast-v1, пока не подключён

Публичная база: 39-сегментный DigiWheel, 20 динамически назначаемых bonus symbols, пять bonus games, wheel multipliers 2–50×, заявленные bonus caps 10 000× и 20 000× в Lightning Storm bonus.

| Gross | Weight / 1M |
| ---: | ---: |
| 0× | 615 670 |
| 1× | 200 000 |
| 2× | 98 000 |
| 3× | 50 000 |
| 5× | 25 000 |
| 10× | 8 000 |
| 20× | 2 000 |
| 50× | 1 000 |
| 100× | 200 |
| 250× | 80 |
| 500× | 30 |
| 1 000× | 12 |
| 3 000× | 4 |
| 5 000× | 2 |
| 10 000× | 1 |
| 20 000× | 1 |

Сумма `1 000 000`, mean gross `0.9600`. По сравнению с Crazy Time больше массы отдано диапазону 100–1 000×, чтобы выразить многочисленные supercharged bonus mechanics.

## 5. Funky Time — forecast-v1, пока не подключён

Публичная база: 64-сегментный DigiWheel, 24 letter segments с базовой выплатой 25:1, динамические multipliers и четыре bonus games: Bar, Stayin’ Alive, Disco, VIP Disco.

| Gross | Weight / 1M |
| ---: | ---: |
| 0× | 621 337 |
| 1× | 180 000 |
| 2× | 105 000 |
| 3× | 50 000 |
| 5× | 30 000 |
| 10× | 10 000 |
| 25× | 3 000 |
| 50× | 500 |
| 100× | 100 |
| 250× | 40 |
| 500× | 14 |
| 1 000× | 5 |
| 3 000× | 1 |
| 5 000× | 1 |
| 10 000× | 1 |
| 20 000× | 1 |

Сумма `1 000 000`, mean gross `0.9600`. Верхние 10 000× и 20 000× здесь — **редакционный forecast tail**, а не заявленный Evolution cap.

## 6. MONOPOLY Live — forecast-v1, пока не подключён

Публичная база: 54 равных сегмента — 48 numbered, 2 Chance, 3 `2 ROLLS`, 1 `4 ROLLS`; Chance даёт cash или multiplier, roll-сегменты запускают board bonus.

| Gross | Weight / 1M |
| ---: | ---: |
| 0× | 569 984 |
| 1× | 220 000 |
| 2× | 117 500 |
| 3× | 50 000 |
| 5× | 30 000 |
| 10× | 10 000 |
| 20× | 2 000 |
| 50× | 400 |
| 100× | 100 |
| 500× | 10 |
| 1 000× | 3 |
| 2 000× | 1 |
| 10 000× | 1 |
| 15 000× | 1 |

Сумма `1 000 000`, mean gross `0.9600`. Хвост реже и короче Lightning Storm, потому что основа модели — numbered wheel с редкими Chance/board escalations.

## 7. Dream Catcher — forecast-v1, пока не подключён

Публичная база: 54 равных сегмента, 52 numbered (`1`, `2`, `5`, `10`, `20`, `40`) и два multiplier segments (`2×`, `7×`); multiplier переносится на следующий spin и может перемножаться при серии. Evolution заявляет потенциал до 20 000×.

| Gross | Weight / 1M |
| ---: | ---: |
| 0× | 573 076 |
| 1× | 200 000 |
| 2× | 165 000 |
| 5× | 50 000 |
| 10× | 10 000 |
| 20× | 1 500 |
| 40× | 400 |
| 100× | 20 |
| 1 000× | 2 |
| 10 000× | 1 |
| 20 000× | 1 |

Сумма `1 000 000`, mean gross `0.9600`. Это самая простая таблица; серии `2×/7×` уже свёрнуты в итоговые крупные buckets.

## 8. Источники и границы исследования

### 8.1. Crazy Time — official / regulatory

- [Evolution — Crazy Time](https://games.evolution.com/live-casino/game-shows/crazy-time/)
- [Evolution — How to Play Crazy Time](https://games.evolution.com/live-casino/game-shows/crazy-time/how-to-play/)
- [Evolution Game Rules, English, Loto-Québec — wheel, mechanics, payout convention and per-spot RTP](https://assets.lotoquebec.com/ressources/assets/v3/assets/blt8296e79a7001648c/blta83347c0701d4ab1/6470f496f6df4f865bb5009e/Crazy-Time_rules_en.pdf)
- [Evolution Game Rules dated 2024-12-30 — current global rules cross-check](https://cdpdf.hollywoodbets.net/GAMERULES/EvolutionGameRules30122024.pdf)
- [58 Pa. Code Chapter 690 — regional wheel order and distinct US rules](https://www.pacodeandbulletin.gov/secure/pacode/data/058/chapter690/chap690toc.html)
- [Evolution — Crazy Time launch in Pennsylvania and West Virginia](https://www.evolution.com/news/evolutions-crazy-time-worlds-1-live-game-show-launches-in-pennsylvania-and-west-virginia)

### 8.2. Crazy Time — observed / reconstructed

- [Tracksino — Top Slot Statistics, 457,188 spins](https://www.tracksino.com/news/top-slot-statistics)
- [Tracksino — Crazy Time Bonus Secrets, conditional Top Slot and 11,962 bonus spins](https://www.tracksino.com/news/crazy-time-segment-secrets)
- [Tracksino — Cash Hunt Secret Revealed, 15,955 bonus rounds](https://www.tracksino.com/news/cash-hunt-secret-revealed)
- [Tracksino — Does Time Affect Crazy Time?, 463,765 spins](https://www.tracksino.com/news/does-time-affect-crazy-time)
- [Wizard of Odds — Crazy Time reverse engineering and explicit best-guess disclaimer](https://wizardofodds.com/games/crazy-time/)
- [Evolution-related patent US20210241579A1 — physical wheel + secondary RNG architecture](https://patents.google.com/patent/US20210241579A1/en)
- [UK Gambling Commission RTS 7 — generation of random outcomes](https://www.gamblingcommission.gov.uk/standards/remote-gambling-and-software-technical-standards/rts-7-generation-of-random-outcomes)
- [UK Gambling Commission — testing procedure for RNG, scaling, game math and RTP](https://www.gamblingcommission.gov.uk/strategy/testing-strategy-for-compliance-with-remote-gambling-and-software-technical/3-procedure-for-testing)

### 8.3. Остальные game shows

- [Evolution — Lightning Storm](https://games.evolution.com/live-casino/game-shows/lightning-storm/)
- [Evolution — Funky Time](https://games.evolution.com/live-casino/game-shows/funky-time/)
- [Evolution — MONOPOLY Live](https://games.evolution.com/live-casino/game-shows/monopoly-live/)
- [Evolution — Dream Catcher](https://games.evolution.com/live-casino/game-shows/dream-catcher/)
- [Evolution Annual Report 2024](https://www.evolution.com/wp-content/uploads/2025/04/Evolution-Annual-Report-2024.pdf)

Crazy Time v1 является `best-public-data, moment-matched reconstruction`, а не `verified official math`; четыре остальные таблицы остаются `illustrative/forecast`. Production adapter Crazy Time обязан реализовать именно причинную модель раздела 3, сохранить source snapshot/version, пройти analytical RTP tests и sensitivity review. Получение официальной PAR sheet повышает статус модели и требует новой major version, даже если средние RTP не изменятся.
