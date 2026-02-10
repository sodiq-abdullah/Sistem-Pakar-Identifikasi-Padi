'use client';

import styles from './diagnostic.module.css';

export default function Diagnostic() {
  return (
    <div className={styles.diagnosticContainer}>
      <h2>🔍 AI Model Diagnostic</h2>
      <p>Open Browser Console (F12) and run these commands:</p>
      
      <div className={styles.diagnosticBox}>
        <p>Check TensorFlow:</p>
        <code>console.log('tf:', typeof window.tf !== 'undefined' ? '✓ Loaded' : '✗ Not loaded')</code>
      </div>

      <div className={styles.diagnosticBox}>
        <p>Check Teachable Machine:</p>
        <code>console.log('tmImage:', typeof window.tmImage !== 'undefined' ? '✓ Loaded' : '✗ Not loaded')</code>
      </div>

      <div className={styles.diagnosticBox}>
        <p>Check model files:</p>
        <code>fetch('/model/model.json').then(r =&gt; console.log('model.json:', r.status))</code>
        <br />
        <code>fetch('/model/metadata.json').then(r =&gt; console.log('metadata.json:', r.status))</code>
        <br />
        <code>fetch('/model/weights.bin').then(r =&gt; console.log('weights.bin:', r.status))</code>
      </div>

      <h3>If libraries not loaded:</h3>
      <p>Run this in console to preload:</p>
      <div className={styles.diagnosticWarning}>
        <code>
          fetch('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0').then(r =&gt; console.log('TF:', r.status))
        </code>
        <br />
        <code>
          fetch('https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5').then(r =&gt; console.log('TM:', r.status))
        </code>
      </div>
    </div>
  );
}
