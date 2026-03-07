'use client';

import React, { useEffect, useRef } from 'react';
import QRCodeStyling, {
    DrawType,
    TypeNumber,
    Mode,
    ErrorCorrectionLevel,
    DotType,
    CornerSquareType,
    CornerDotType,
    Options,
} from 'qr-code-styling';

interface ElegantQRCodeProps {
    data: string;
    size?: number;
    logo?: string;
}

const ElegantQRCodeClient: React.FC<ElegantQRCodeProps> = ({ data, size = 300, logo }) => {
    const ref = useRef<HTMLDivElement>(null);
    const qrCode = useRef<QRCodeStyling | null>(null);

    useEffect(() => {
        // Basic options
        const options: Options = {
            width: size,
            height: size,
            data: data,
            // Use provided logo or fallback to next.svg
            ...(logo ? { image: logo } : { image: '/next.svg' }),
            dotsOptions: {
                type: 'rounded' as DotType,
                gradient: {
                    type: 'linear',
                    rotation: 0,
                    colorStops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#444444' }]
                }
            },
            imageOptions: {
                crossOrigin: 'anonymous',
                margin: 10,
                imageSize: 0.4
            },
            cornersSquareOptions: {
                type: 'extra-rounded' as CornerSquareType,
                color: '#000000'
            },
            cornersDotOptions: {
                type: 'dot' as CornerDotType,
                color: '#000000'
            },
            backgroundOptions: {
                color: '#ffffff',
            }
        };

        // Initialize only if not already initialized
        if (!qrCode.current) {
            qrCode.current = new QRCodeStyling(options);
        } else {
            qrCode.current.update(options);
        }

        if (ref.current) {
            ref.current.innerHTML = '';
            qrCode.current.append(ref.current);
        }
    }, [size]); // Re-init on size change

    useEffect(() => {
        if (qrCode.current) {
            const updateOptions: Partial<Options> = {
                data: data,
            };
            if (logo) {
                updateOptions.image = logo;
            } else {
                updateOptions.image = '/next.svg';
            }
            qrCode.current.update(updateOptions);
        }
    }, [data, logo]);

    return <div ref={ref} className="elegant-qr-code rounded-xl overflow-hidden flex justify-center items-center" />;
};

export default ElegantQRCodeClient;
