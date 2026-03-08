import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner() {
  return (
    <div className={styles.wrap}>
      <div className={styles.spinner} />
      <span>데이터 불러오는 중...</span>
    </div>
  );
}
