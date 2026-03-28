import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

const LINE_ART_XML = `
<svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="#7A8B88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M80 150 C60 130, 65 100, 90 95 C105 90, 120 110, 110 140 C100 160, 75 160, 65 145"/>
    <path d="M90 95 L95 80 L100 95"/>
    <path d="M105 95 L110 80 L115 95"/>
    <path d="M60 145 C50 150, 50 165, 65 165"/>
    <path d="M85 150 L80 170"/>
    <path d="M100 150 L95 170"/>
    <path d="M150 160 C140 130, 140 80, 180 75 C210 70, 240 100, 240 140 C240 170, 210 185, 180 175 C165 170, 155 165, 150 160"/>
    <path d="M180 75 C185 60, 210 60, 215 75"/>
    <path d="M185 160 L180 180"/>
    <path d="M210 160 L205 180"/>
  </g>
</svg>`;

export default function PetCompanionLineArt() {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <SvgXml xml={LINE_ART_XML} width="100%" height="100%" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '46%',
    maxWidth: 168,
    height: 88,
    alignSelf: 'center',
    marginTop: 10,
    opacity: 0.22,
  },
});
