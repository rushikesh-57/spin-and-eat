import { useCallback, useEffect, useRef, useState } from 'react';
import { FoodWheel } from '../FoodWheel';
import { SpinButton } from '../SpinButton';
import { ResultDisplay } from '../ResultDisplay';
import { useWheelSpin } from '../../hooks/useWheelSpin';
import { useCustomWheelItems } from '../../hooks/useCustomWheelItems';
import { playSpinCompleteSound, playSpinStartSound } from '../../utils/sound';
import { useAlertDialog } from '../layout/AlertDialogProvider';
import styles from './MakeYourOwnWheel.module.css';

const MOBILE_LAYOUT_QUERY = '(max-width: 719px)';

interface MakeYourOwnWheelProps {
  userId: string | null;
  guideTarget?: 'wheel' | 'options' | null;
}

export function MakeYourOwnWheel({ userId, guideTarget = null }: MakeYourOwnWheelProps) {
  const [newOption, setNewOption] = useState('');
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    window.matchMedia(MOBILE_LAYOUT_QUERY).matches
  );
  const [showControls, setShowControls] = useState(() =>
    !window.matchMedia(MOBILE_LAYOUT_QUERY).matches
  );
  const [showMobileResult, setShowMobileResult] = useState(false);
  const wheelCardRef = useRef<HTMLElement | null>(null);
  const optionsCardRef = useRef<HTMLElement | null>(null);
  const customWheel = useCustomWheelItems(userId);
  const { confirm } = useAlertDialog();

  const { rotation, isSpinning, selectedItem, spin } = useWheelSpin(customWheel.filteredItems);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);

    const updateLayout = (matches: boolean) => {
      setIsMobileLayout(matches);
      setShowControls(!matches);
    };

    updateLayout(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateLayout(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (isSpinning) {
      setShowMobileResult(false);
      return;
    }

    if (isMobileLayout && selectedItem) {
      setShowMobileResult(true);
    }
  }, [isMobileLayout, isSpinning, selectedItem]);

  useEffect(() => {
    if (guideTarget === 'options') {
      setShowControls(true);
    }
  }, [guideTarget]);

  useEffect(() => {
    if (!guideTarget) {
      return;
    }

    const targetRef = guideTarget === 'wheel' ? wheelCardRef : optionsCardRef;
    const timeoutId = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [guideTarget]);

  const handleAddOption = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      customWheel.addItem(newOption);
      setNewOption('');
    },
    [customWheel, newOption]
  );

  const handleSpin = useCallback(() => {
    playSpinStartSound();
    spin(() => {
      playSpinCompleteSound();
    });
  }, [spin]);

  return (
    <div className={styles.layout}>
      <section
        ref={wheelCardRef}
        className={`${styles.spinPanel} ${guideTarget === 'wheel' ? styles.guideSpotlight : ''}`}
        aria-labelledby="custom-wheel-heading"
      >
        <div className={styles.panelHeader}>
          <div>
            <h2 id="custom-wheel-heading" className={styles.panelTitle}>
              Make your own wheel
            </h2>
            <p className={styles.panelSubtitle}>
              Add any options you want and let the same wheel decide.
            </p>
          </div>
          <span className={styles.panelBadge}>Custom</span>
        </div>

        <div className={styles.wheelWrap}>
          <FoodWheel
            items={customWheel.filteredItems}
            rotation={rotation}
            aria-label={`Wheel with ${customWheel.filteredItems.length} custom options`}
          />
        </div>

        <div className={styles.spinRow}>
          <SpinButton
            onClick={handleSpin}
            disabled={isSpinning || customWheel.filteredItems.length === 0}
            isSpinning={isSpinning}
            aria-label="Spin the wheel to pick a custom option"
          />
        </div>

        <ResultDisplay
          item={isMobileLayout ? null : selectedItem}
          isSpinning={isSpinning}
          showHintWhenEmpty={!isMobileLayout}
        />
      </section>

      <section
        ref={optionsCardRef}
        className={`${styles.controlsPanel} ${guideTarget === 'options' ? styles.guideSpotlight : ''}`}
        aria-label="Custom wheel options"
      >
        <button
          type="button"
          className={styles.controlsToggle}
          onClick={() => setShowControls((prev) => !prev)}
          aria-expanded={showControls}
          aria-controls="custom-wheel-options"
        >
            <span className={styles.controlsToggleText}>
              <span className={styles.panelTitle}>Wheel options</span>
              <span className={styles.panelSubtitle}>
                Add and choose what stays on your wheel.
              </span>
            </span>
          <span className={styles.controlsToggleIcon} aria-hidden="true">
            {showControls ? 'Hide' : 'Show'}
          </span>
        </button>

        <div
          id="custom-wheel-options"
          className={showControls ? styles.controlsContent : styles.controlsContentClosed}
        >
          <div className={styles.content}>
            <form onSubmit={handleAddOption} className={styles.addForm}>
              <label htmlFor="custom-wheel-option" className={styles.srOnly}>
                New custom option
              </label>
              <input
                id="custom-wheel-option"
                type="text"
                value={newOption}
                onChange={(event) => setNewOption(event.target.value)}
                placeholder="e.g. Goa trip, Movie night, Biryani"
                className={styles.input}
                aria-label="New custom option"
              />
              <button type="submit" className={styles.addBtn} disabled={!newOption.trim()}>
                Add option
              </button>
            </form>

            {customWheel.items.length === 0 ? (
              <p className={styles.emptyText}>
                Start by adding your first custom option.
              </p>
            ) : (
              <ul className={styles.list} role="list">
                {customWheel.items.map((item) => {
                  const isIncluded = customWheel.includedIds.includes(item.id);

                  return (
                    <li key={item.id} className={styles.item}>
                      <button
                        type="button"
                        onClick={() => customWheel.toggleIncluded(item.id)}
                        className={isIncluded ? styles.pillButton : styles.pillButtonMuted}
                        aria-pressed={isIncluded}
                        aria-label={`${item.name} ${isIncluded ? 'shown on wheel' : 'hidden from wheel'}`}
                      >
                        <span className={styles.itemName}>{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {customWheel.items.length > 0 ? (
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Clear custom wheel?',
                    message: 'This will remove every custom option from this wheel.',
                    confirmLabel: 'Clear wheel',
                    tone: 'danger',
                  });

                  if (confirmed) {
                    customWheel.clearAll();
                  }
                }}
                className={styles.clearBtn}
              >
                Clear custom wheel
              </button>
            ) : (
              <p className={styles.emptyHint}>
                Your custom wheel is saved on this device, so you can build it up over time.
              </p>
            )}
          </div>
        </div>
      </section>

      {isMobileLayout && showMobileResult ? (
        <ResultDisplay
          item={selectedItem}
          isSpinning={false}
          asDialog
          onDismiss={() => setShowMobileResult(false)}
          onSpinAgain={() => {
            setShowMobileResult(false);
            handleSpin();
          }}
        />
      ) : null}
    </div>
  );
}
