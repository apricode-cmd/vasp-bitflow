# Phone Input & Country Dropdown Components

## 📦 Установленные компоненты

### 1. PhoneInput
Международный телефонный инпут с выбором страны и флагом.

**Файл:** `src/components/ui/phone-input.tsx`

**Зависимости:**
- `react-phone-number-input` - библиотека для работы с телефонными номерами
- `react-phone-number-input/flags` - флаги стран

### 2. CountryDropdown
Выпадающий список стран с флагами и поиском.

**Файл:** `src/components/ui/country-dropdown.tsx`

**Зависимости:**
- `react-circle-flags` - круглые флаги стран
- `country-data-list` - список стран с данными

---

## 🎯 Примеры использования

### PhoneInput

```tsx
import { PhoneInput } from '@/components/ui/phone-input';
import { useState } from 'react';

function MyComponent() {
  const [phoneNumber, setPhoneNumber] = useState('');

  return (
    <div>
      <label>Phone Number</label>
      <PhoneInput
        value={phoneNumber}
        onChange={setPhoneNumber}
        defaultCountry="PL"
        placeholder="Enter phone number"
      />
      <p>Value: {phoneNumber}</p>
    </div>
  );
}
```

**Props:**
- `value` - текущее значение (E.164 format, например "+48123456789")
- `onChange` - callback при изменении значения
- `defaultCountry` - страна по умолчанию (ISO Alpha-2, например "PL", "US")
- `placeholder` - placeholder текст
- `disabled` - отключение инпута
- `className` - дополнительные CSS классы

**Валидация:**
```tsx
import { isValidPhoneNumber } from 'react-phone-number-input';

const isValid = isValidPhoneNumber(phoneNumber);
```

---

### CountryDropdown

```tsx
import { CountryDropdown, Country } from '@/components/ui/country-dropdown';
import { useState } from 'react';

function MyComponent() {
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>();

  const handleCountryChange = (country: Country) => {
    console.log('Selected:', country);
    setSelectedCountry(country);
  };

  return (
    <div>
      <label>Country</label>
      <CountryDropdown
        defaultValue={selectedCountry?.alpha3}
        onChange={handleCountryChange}
        placeholder="Select your country"
      />
      {selectedCountry && (
        <p>Selected: {selectedCountry.name} ({selectedCountry.alpha2})</p>
      )}
    </div>
  );
}
```

**Props:**
- `defaultValue` - код страны по умолчанию (ISO Alpha-3, например "POL", "USA")
- `onChange` - callback при выборе страны
- `placeholder` - placeholder текст
- `disabled` - отключение dropdown
- `slim` - компактный режим (только флаг без названия)
- `options` - кастомный список стран (по умолчанию загружается из `country-data-list`)

**Country Interface:**
```typescript
interface Country {
  alpha2: string;        // ISO Alpha-2 код (PL, US)
  alpha3: string;        // ISO Alpha-3 код (POL, USA)
  name: string;          // Название страны
  emoji?: string;        // Эмодзи флага
  currencies: string[];  // Коды валют
  languages: string[];   // Языки
  countryCallingCodes: string[]; // Телефонные коды
}
```

---

## 🎨 Использование с React Hook Form

### PhoneInput с валидацией

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PhoneInput } from '@/components/ui/phone-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isValidPhoneNumber, 'Invalid phone number'),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <PhoneInput
                  {...field}
                  defaultCountry="PL"
                  placeholder="Enter phone number"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}
```

### CountryDropdown с React Hook Form

```tsx
import { CountryDropdown } from '@/components/ui/country-dropdown';

const formSchema = z.object({
  country: z.string().min(1, 'Country is required'),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <CountryDropdown
                  defaultValue={field.value}
                  onChange={(country) => field.onChange(country.alpha3)}
                  placeholder="Select your country"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}
```

---

## 🎨 Стилизация

Оба компонента используют Tailwind CSS и shadcn/ui дизайн-систему, поэтому автоматически адаптируются под вашу тему, включая:
- ✅ Primary color
- ✅ Dark mode
- ✅ Glassmorphism (если применен к Popover)
- ✅ Responsive design

---

## 📝 TypeScript

Типы для всех библиотек определены в:
- `src/types/phone-country.d.ts`

Это обеспечивает полную типизацию без необходимости установки `@types/*` пакетов.

---

## 🚀 Готово к использованию!

Все компоненты установлены и готовы к использованию в вашем проекте.

