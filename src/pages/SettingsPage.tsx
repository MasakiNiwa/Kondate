import { CookingPot, Palette, Sparkles, Sun, Users } from 'lucide-react';
import { PersonaPicker } from '@/features/ai/PersonaPicker';
import { CloudSettings } from '@/features/cloud/CloudSettings';
import { TaskModels } from '@/features/cloud/TaskModels';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Section } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { DataSection } from '@/features/settings/DataSection';
import { MembersEditor } from '@/features/settings/MembersEditor';
import { PALETTE_LABELS, THEME_LABELS, options } from '@/features/settings/labels';
import { useSettings } from '@/features/settings/settingsStore';
import { WeatherLocationField } from '@/features/settings/WeatherLocationField';
import { formatPercent } from '@/lib/utils/format';

const WEIGHT_LABEL = (v: number) => (v === 0 ? 'なし' : v < 1 ? '弱め' : v === 1 ? '標準' : '強め');

export default function SettingsPage() {
  const s = useSettings();
  const update = s.update;
  return (
    <>
      <PageHeader title="設定" />
      <PageBody>
        <Section
          title="家族と栄養"
          description="人数・栄養の基準・ご飯の量"
          icon={<Users />}
          collapsible
        >
          <MembersEditor />
          <Field
            label="夕食でとる栄養の割合"
            hint="1 日に必要な栄養のうち、夕食で満たす割合（朝・昼で残りをとる想定）"
          >
            <Slider
              value={s.dinnerShare}
              min={0.3}
              max={0.5}
              step={0.01}
              onChange={(dinnerShare) => update({ dinnerShare })}
              format={formatPercent}
            />
          </Field>
          <Field label="ご飯の量（1 人分）" hint="0 にすると主食なしで計算します">
            <Slider
              value={s.riceGrams}
              min={0}
              max={300}
              step={10}
              onChange={(riceGrams) => update({ riceGrams })}
              format={(v) => `${v}g`}
            />
          </Field>
        </Section>

        <Section
          title="調理と買い物"
          description="調理時間・買い物の回数・くり返し"
          icon={<CookingPot />}
          collapsible
        >
          <Field label="平日の調理時間の目安" hint="主菜・副菜・汁物の合計">
            <Slider
              value={s.weekdayMinutes}
              min={15}
              max={90}
              step={5}
              onChange={(weekdayMinutes) => update({ weekdayMinutes })}
              format={(v) => `${v}分`}
            />
          </Field>
          <Field label="休日の調理時間の目安">
            <Slider
              value={s.weekendMinutes}
              min={15}
              max={120}
              step={5}
              onChange={(weekendMinutes) => update({ weekendMinutes })}
              format={(v) => `${v}分`}
            />
          </Field>
          <Field label="献立を作る日数（既定）">
            <Slider
              value={s.planDays}
              min={3}
              max={14}
              step={1}
              onChange={(planDays) => update({ planDays })}
              format={(v) => `${v}日`}
            />
          </Field>
          <Field
            label="買い物の回数（期間中）"
            hint="2 回にすると、日持ちしない食材も使いやすくなります"
          >
            <Slider
              value={s.shoppingTrips}
              min={1}
              max={3}
              step={1}
              onChange={(shoppingTrips) => update({ shoppingTrips })}
              format={(v) => `${v}回`}
            />
          </Field>
          <Field label="同じ料理を出さない日数" hint="過去の献立と見比べて、くり返しを避けます">
            <Slider
              value={s.repeatGapDays}
              min={0}
              max={30}
              step={1}
              onChange={(repeatGapDays) => update({ repeatGapDays })}
              format={(v) => `${v}日`}
            />
          </Field>
          <Field label="肉・魚を冷凍して使う" hint="オンにすると日持ちを 2 週間として計算します">
            <Switch
              checked={s.useFreezer}
              onChange={(useFreezer) => update({ useFreezer })}
              label="肉・魚を冷凍して使う"
            />
          </Field>
        </Section>

        <Section
          title="季節と気候"
          description="旬の食材・気温に合った料理"
          icon={<Sun />}
          collapsible
        >
          <Field label="旬を重視する" hint="旬の食材を使う料理を選びやすくします（旬は安く計算）">
            <Slider
              value={s.seasonWeight}
              min={0}
              max={2}
              step={0.5}
              onChange={(seasonWeight) => update({ seasonWeight })}
              format={WEIGHT_LABEL}
            />
          </Field>
          <Field label="気温に合わせる" hint="暑い日はさっぱり・冷たい料理、寒い日は温かい料理">
            <Slider
              value={s.weatherWeight}
              min={0}
              max={2}
              step={0.5}
              onChange={(weatherWeight) => update({ weatherWeight })}
              format={WEIGHT_LABEL}
            />
          </Field>
          <WeatherLocationField />
        </Section>

        <Section
          title="AI"
          description="接続先・API キー・キャラクター（使わなくても大丈夫）"
          icon={<Sparkles />}
          collapsible
        >
          <CloudSettings />
          <PersonaPicker />
          <TaskModels />
        </Section>

        <Section title="表示" description="テーマと配色" icon={<Palette />} collapsible>
          <Field label="テーマ">
            <Select
              value={s.theme}
              options={options(THEME_LABELS)}
              onChange={(theme) => update({ theme })}
            />
          </Field>
          <Field label="ダークモードの配色" hint="目に優しい、落ち着いた配色を選べます">
            <Select
              value={s.darkPalette}
              options={options(PALETTE_LABELS)}
              onChange={(darkPalette) => update({ darkPalette })}
            />
          </Field>
        </Section>

        <DataSection />
      </PageBody>
    </>
  );
}
