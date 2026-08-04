'use client';

import { useRef, useState } from 'react';
import { Button, Flex, App } from 'antd';
import { CameraOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export type GeoTagFile = {
  uid: string;
  name: string;
  status: 'done';
  url?: string;
  thumbUrl?: string;
  originFileObj?: File;
};

type Props = {
  fileList: GeoTagFile[];
  onChange: (fileList: GeoTagFile[]) => void;
  maxCount?: number;
};

function getLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

async function stampImage(file: File, location: { lat: number; lng: number } | null): Promise<File> {
  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0);

  const now = dayjs();
  const groups: { label: string; lines: string[] }[] = [
    {
      label: 'Location',
      lines: location ? [location.lat.toFixed(4), location.lng.toFixed(4)] : ['Unavailable'],
    },
    { label: 'Captured', lines: [now.format('DD MMM YYYY'), now.format('hh:mm A')] },
  ];

  const fontSize = Math.max(16, Math.round(canvas.width * 0.028));
  const labelFontSize = Math.round(fontSize * 1.05);
  const lineHeight = Math.round(fontSize * 1.3);
  const groupGap = Math.round(lineHeight * 0.5);
  const padding = Math.max(14, Math.round(canvas.width * 0.025));

  const totalLines = groups.reduce((sum, g) => sum + 1 + g.lines.length, 0);
  const boxHeight = totalLines * lineHeight + (groups.length - 1) * groupGap + padding * 2;
  const boxWidth = Math.min(canvas.width, Math.round(canvas.width * 0.55));

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, canvas.height - boxHeight, boxWidth, boxHeight);

  let y = canvas.height - boxHeight + padding;
  ctx.textBaseline = 'top';
  groups.forEach((group, gi) => {
    ctx.fillStyle = '#7dd3fc';
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    ctx.fillText(group.label, padding, y);
    y += lineHeight;

    ctx.fillStyle = '#ffffff';
    ctx.font = `${fontSize}px sans-serif`;
    group.lines.forEach((line) => {
      ctx.fillText(line, padding, y);
      y += lineHeight;
    });

    if (gi < groups.length - 1) y += groupGap;
  });

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9));
  if (!blob) return file;
  const stampedName = file.name.replace(/\.[^./]+$/, '') + '-geotag.jpg';
  return new File([blob], stampedName, { type: 'image/jpeg' });
}

export function GeoTagPhotoCapture({ fileList, onChange, maxCount = 2 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState(false);
  const { message } = App.useApp();

  const handleFile = async (file: File) => {
    setCapturing(true);
    try {
      const location = await getLocation();
      const stamped = await stampImage(file, location);
      const url = URL.createObjectURL(stamped);
      const newItem: GeoTagFile = {
        uid: `geo-${Date.now()}`,
        name: stamped.name,
        status: 'done',
        originFileObj: stamped,
        url,
        thumbUrl: url,
      };
      onChange([...fileList, newItem].slice(0, maxCount));
    } catch {
      message.error('Failed to capture photo');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <Flex gap={8} wrap="wrap">
        {fileList.map((f) => (
          <div key={f.uid} className="relative" style={{ width: 80, height: 80 }}>
            <img
              src={f.thumbUrl || f.url}
              alt={f.name}
              className="h-full w-full rounded-lg object-cover border border-[var(--border)]"
            />
            <button
              type="button"
              onClick={() => onChange(fileList.filter((x) => x.uid !== f.uid))}
              className="absolute -right-2 -top-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white"
              aria-label="Remove photo"
            >
              <DeleteOutlined style={{ fontSize: 11 }} />
            </button>
          </div>
        ))}
        {fileList.length < maxCount && (
          <Button
            icon={<CameraOutlined />}
            loading={capturing}
            onClick={() => inputRef.current?.click()}
            style={{ width: 80, height: 80 }}
            className="flex flex-col items-center justify-center"
          >
            {!capturing && 'Camera'}
          </Button>
        )}
      </Flex>
    </div>
  );
}
